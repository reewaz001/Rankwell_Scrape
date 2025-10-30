import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * BQS (Backlink Quality Score) Calculator Service
 *
 * Calculates quality scores for backlink opportunities based on:
 * - Trust Flow (TF)
 * - Citation Flow (CF)
 * - Domain Rating (DR)
 * - Traffic
 * - Referring Domains
 *
 * Ported from Python implementation
 */

export interface BQSResult {
  bqs: number;
  passed_filter: boolean;
  filter_reason: string;
  authority: number;
  traffic_normalized: number;
  rd_normalized: number;
  consistency_penalty: number;
  gap_cf: number;
  gap_dr: number;
  quality_tier: string;
  metrics: {
    tf: number;
    cf: number;
    dr: number;
    traffic: number;
    domain_ref: number;
  };
}

@Injectable()
export class BQSCalculatorService {
  private readonly logger = new Logger(BQSCalculatorService.name);
  private readonly tMax: number;
  private readonly rdMax: number;
  private readonly hardFilter: boolean;

  constructor(private readonly configService: ConfigService) {
    this.tMax = this.configService.get<number>('BQS_T_MAX', 100000);
    this.rdMax = this.configService.get<number>('BQS_RD_MAX', 1000);
    this.hardFilter = this.configService.get<boolean>('BQS_HARD_FILTER', true);
  }

  /**
   * Clamp value between lo and hi
   */
  private clamp(x: number, lo: number = 0, hi: number = 100): number {
    return Math.min(Math.max(x, lo), hi);
  }

  /**
   * Normalize using log scale
   */
  private normLog(x: number, xmax: number): number {
    if (xmax <= 0) {
      return 0;
    }
    return this.clamp((100 * Math.log10(x + 1)) / Math.log10(xmax + 1));
  }

  /**
   * Apply hard filters to eliminate low-quality candidates
   */
  private applyHardFilters(metrics: {
    tf: number;
    cf: number;
    dr: number;
    traffic: number;
  }): { pass: boolean; reason: string } {
    const { tf, cf, dr, traffic } = metrics;

    // TF >= 10 and DR >= 10
    if (tf < 10) {
      return { pass: false, reason: `TF too low (${tf} < 10)` };
    }
    if (dr < 10) {
      return { pass: false, reason: `DR too low (${dr} < 10)` };
    }

    // Traffic >= 100/month
    if (traffic < 100) {
      return { pass: false, reason: `Traffic too low (${traffic} < 100)` };
    }

    // gap_cf <= 40 and gap_dr <= 40
    const gapCf = Math.abs(cf - tf);
    const gapDr = Math.abs(dr - tf);

    if (gapCf > 40) {
      return { pass: false, reason: `CF/TF gap too large (${gapCf} > 40)` };
    }
    if (gapDr > 40) {
      return { pass: false, reason: `DR/TF gap too large (${gapDr} > 40)` };
    }

    return { pass: true, reason: 'Passed all filters' };
  }

  /**
   * Calculate BQS score for a backlink candidate
   */
  calculateScore(data: any): BQSResult {
    // Extract metrics with fallbacks
    const tf = parseFloat(data.tf || 0);
    const cf = parseFloat(data.cf || 0);
    const traffic = parseFloat(data.traffic || 0);
    const domainRef = parseFloat(data.domain_ref || 0);

    // Handle different DR field names
    let dr = parseFloat(data.domainRating || data.da || 0);
    if (dr === 0 && data.da) {
      dr = parseFloat(data.da || 0);
    }

    const metrics = { tf, cf, dr, traffic, domain_ref: domainRef };

    // Normalize traffic and referring domains
    const trafficN = this.normLog(traffic, this.tMax);
    const rdN = this.normLog(domainRef, this.rdMax);

    // Calculate consistency penalties
    const gapCf = Math.abs(cf - tf);
    const gapDr = Math.abs(dr - tf);

    const penCf = Math.min(gapCf / 50, 1);
    const penDr = Math.min(gapDr / 50, 1);
    const consistencyPenalty = 100 * (0.6 * penCf + 0.4 * penDr);

    // Calculate authority score
    const authority = 0.4 * tf + 0.4 * dr + 0.2 * cf;

    // Calculate final BQS
    const bqs = this.clamp(
      0.45 * authority +
        0.3 * trafficN +
        0.25 * rdN -
        0.6 * consistencyPenalty,
    );

    // Check if it passes hard filters
    let passedFilter = true;
    let filterReason = 'Passed all filters';

    if (this.hardFilter) {
      const filterResult = this.applyHardFilters(metrics);
      passedFilter = filterResult.pass;
      filterReason = filterResult.reason;
    }

    return {
      bqs: Math.round(bqs * 100) / 100,
      passed_filter: passedFilter,
      filter_reason: filterReason,
      authority: Math.round(authority * 100) / 100,
      traffic_normalized: Math.round(trafficN * 100) / 100,
      rd_normalized: Math.round(rdN * 100) / 100,
      consistency_penalty: Math.round(consistencyPenalty * 100) / 100,
      gap_cf: Math.round(gapCf * 100) / 100,
      gap_dr: Math.round(gapDr * 100) / 100,
      metrics,
      quality_tier: this.getQualityTier(bqs),
    };
  }

  /**
   * Get quality tier based on BQS score
   */
  private getQualityTier(bqs: number): string {
    if (bqs >= 75) {
      return 'Excellent';
    } else if (bqs >= 60) {
      return 'Good';
    } else if (bqs >= 45) {
      return 'Fair';
    } else {
      return 'Poor';
    }
  }

  /**
   * Calculate ROI score (value per euro/dollar)
   */
  calculateROI(bqs: number, price: number): number {
    if (price <= 0) {
      return 0;
    }
    return Math.round((bqs / price) * 100) / 100;
  }

  /**
   * Score multiple backlinks and sort by BQS
   */
  batchScore(backlinks: any[]): any[] {
    const scored = backlinks.map((backlink) => {
      const scoreData = this.calculateScore(backlink);

      // Add price-based ROI if price is available
      const price =
        backlink.articles_price || backlink.price || backlink.articles_price || 0;
      if (price > 0) {
        scoreData['roi'] = this.calculateROI(scoreData.bqs, price);
      }

      // Merge original data with score data
      return { ...backlink, ...scoreData };
    });

    // Sort by BQS descending
    scored.sort((a, b) => b.bqs - a.bqs);

    return scored;
  }

  /**
   * Add BQS scores to site data
   */
  addBQSScores(sites: any[]): any[] {
    return sites.map((site) => {
      const scoreResult = this.calculateScore(site);

      // Add main BQS score
      site.bqs_score = scoreResult.bqs;

      // Add detailed info to nested object
      site.bqs_score_info = {
        bqs_quality_tier: scoreResult.quality_tier,
        bqs_authority: scoreResult.authority,
        bqs_consistency_penalty: scoreResult.consistency_penalty,
        bqs_passed_filter: scoreResult.passed_filter,
        bqs_filter_reason: scoreResult.filter_reason,
      };

      // Add ROI calculation if price is available
      const price = site.articles_price || site.price || 0;
      if (price > 0) {
        site.bqs_score_info.bqs_roi = this.calculateROI(scoreResult.bqs, price);
      } else {
        site.bqs_score_info.bqs_roi = null;
      }

      this.logger.log(
        `Site ${site.name} - BQS: ${scoreResult.bqs} (${scoreResult.quality_tier}) - Filter: ${
          scoreResult.passed_filter ? 'PASSED' : 'FAILED: ' + scoreResult.filter_reason
        }`,
      );

      return site;
    });
  }
}
