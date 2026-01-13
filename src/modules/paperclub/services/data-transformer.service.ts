import { Injectable } from '@nestjs/common';
import {
  PaperClubSiteRaw,
  PaperClubSite,
} from '../interfaces/paperclub-site.interface';

/**
 * Data Transformer Service
 *
 * Transforms raw Paper.club API responses into structured site data
 */
@Injectable()
export class DataTransformerService {
  /**
   * Transform raw Paper.club API response to structured site data
   */
  /**
   * Clean domain: remove https://, http://, and www. prefix
   */
  private cleanDomain(domain: string): string {
    if (!domain) return domain;
    return domain
      .replace(/^https?:\/\//i, '')  // Remove http:// or https://
      .replace(/^www\./i, '');        // Remove www.
  }

  transformSite(apiData: PaperClubSiteRaw): PaperClubSite {
    const hosting = apiData.hosting || {};
    const articles = apiData.articles || [{}];
    const articlesFirst = articles[0] || {};
    const kpi = apiData.kpi || {};
    const mainTopic = apiData.mainTopic || {};
    const rawName = apiData.name || '';
    const name = this.cleanDomain(rawName);

    return {
      // Core fields
      name,
      url: `https://${name}`,
      provider: 'Paper Club',

      // Hosting
      hosting_country: hosting.country,
      hosting_code: hosting.code,
      status: apiData.status,

      // Articles
      articles_sponsored: this.boolToTinyint(articlesFirst.sponsored),
      articles_words: this.toFloat(articlesFirst.words),
      articles_price: this.toFloat(articlesFirst.price),

      // KPIs
      traffic: this.toFloat(kpi.traffic),
      tf: this.toFloat(kpi.trustFlow),
      cf: this.toFloat(kpi.citationFlow),
      kpi_ratio: this.toFloat(kpi.ratio),
      domain_ref: this.toFloat(kpi.refDomain),
      bl: this.toFloat(kpi.backLinks),
      keywords: this.toFloat(kpi.keywords),
      domainRating: this.toFloat(kpi.domainRating),
      domainAge: this.toFloat(kpi.domainAge),

      // Topics
      maxTopicalTrustFlow: this.toString(kpi.maxTopicalTrustFlow),
      category: mainTopic.label,

      // Flags
      googleNews: this.boolToTinyint(apiData.googleNews),
      new: this.boolToTinyint(apiData.new),

      // Generated
      link_ahref: `https://app.ahrefs.com/site-explorer/overview/v2/subdomains/live?target=${name}`,
      entry_date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
    };
  }

  /**
   * Transform multiple sites
   */
  transformSites(apiDataList: PaperClubSiteRaw[]): PaperClubSite[] {
    return apiDataList.map((site) => this.transformSite(site));
  }

  /**
   * Convert boolean to tinyint (0/1)
   */
  private boolToTinyint(value: boolean | undefined | null): number | undefined {
    if (value === undefined || value === null) {
      return undefined;
    }
    return value ? 1 : 0;
  }

  /**
   * Safe float conversion
   */
  private toFloat(value: any): number | undefined {
    if (value === undefined || value === null) {
      return undefined;
    }
    try {
      const floatValue = parseFloat(value);
      return isNaN(floatValue) ? undefined : floatValue;
    } catch {
      return undefined;
    }
  }

  /**
   * Safe string conversion
   */
  private toString(value: any): string | undefined {
    if (value === undefined || value === null) {
      return undefined;
    }
    return String(value);
  }
}
