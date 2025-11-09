import { Injectable, Logger } from '@nestjs/common';
import { LightpandaService } from '../../../common/lightpanda.service';
import { NetlinkService, NetlinkItem } from './netlink.service';
import { DashboardHttpClient } from '../../../common/dashboard-http-client.service';
import type { Page } from 'playwright-core';

/**
 * Scraped Data Interface
 */
export interface ScrapedNetlinkData {
  url: string;
  netlinkId?: string | number;
  landingPage?: string;
  scrapedAt: string;
  success: boolean;
  error?: string;

  // Found link data
  foundLink?: {
    href: string;
    text: string;
    outerHTML: string;
    matched: boolean;
    matchType?: 'exact' | 'domain' | 'subdomain';
    rel?: string;
    link_type?: string;
  };

  // All links found (for debugging)
  allLinksCount?: number;

  [key: string]: any;
}

/**
 * Scraping Options Interface
 */
export interface ScrapeOptions {
  concurrency?: number;
  timeout?: number;
  retries?: number;
  delay?: number;
  skipErrors?: boolean;
  onProgress?: (current: number, total: number, url: string) => void;
  onSuccess?: (data: ScrapedNetlinkData) => void | Promise<void>;
  onError?: (url: string, error: Error) => void | Promise<void>;
}

/**
 * Scraping Statistics Interface
 */
export interface ScrapingStats {
  total: number;
  successful: number;
  failed: number;
  skipped: number;
  duration: number;
  startTime: Date;
  endTime?: Date;
  errors: Array<{ url: string; error: string }>;
}

/**
 * Netlink Additional Info for Batch Upsert
 */
export interface NetlinkAdditionalInfo {
  netlink_id: number;
  link_type: string; // 'dofollow' | 'nofollow' | 'unknown'
  online_status: number; // 1 = link found & accessible, 2 = no matching link found, 3 = site not accessible/offline
}

/**
 * Batch Upsert Request Body
 */
export interface BatchUpsertRequest {
  items: NetlinkAdditionalInfo[];
}

/**
 * Netlink Scraper Service
 *
 * Service for scraping individual netlink URLs using Lightpanda browser.
 * Provides infrastructure for:
 * - Scraping individual URLs
 * - Batch scraping with concurrency control
 * - Progress tracking and statistics
 * - Error handling and retries
 * - Data extraction from pages
 *
 * Usage:
 * 1. Implement the extractData() method with your scraping logic
 * 2. Use scrapeNetlink() for single URL
 * 3. Use scrapeAllNetlinks() for batch processing
 */
@Injectable()
export class NetlinkScraperService {
  private readonly logger = new Logger(NetlinkScraperService.name);

  constructor(
    private readonly lightpanda: LightpandaService,
    private readonly netlinkService: NetlinkService,
    private readonly dashboardClient: DashboardHttpClient,
  ) {}

  /**
   * Transform scraped result to NetlinkAdditionalInfo format
   */
  private transformToAdditionalInfo(result: ScrapedNetlinkData): NetlinkAdditionalInfo | null {
    // Skip if no netlinkId
    if (!result.netlinkId) {
      this.logger.warn(`Skipping result without netlinkId: ${result.url}`);
      return null;
    }

    // Determine link_type from the foundLink
    let link_type = 'unknown'; // Default to unknown

    if (result.success && result.foundLink?.matched && result.foundLink?.link_type) {
      // Parse the link_type from the scraped data
      const linkTypeStr = result.foundLink.link_type.toLowerCase();

      // Check if it contains 'nofollow'
      if (linkTypeStr.includes('nofollow')) {
        link_type = 'nofollow';
      } else {
        // If no 'nofollow' found, it's a dofollow link
        link_type = 'dofollow';
      }
    }

    // Determine online_status
    // 1 = link found & accessible (success with matched link)
    // 2 = no matching link found (success but link not matched)
    // 3 = site not accessible/offline (failed to scrape)
    let online_status: number;

    if (!result.success) {
      // Site is not accessible or failed to scrape
      online_status = 3;
    } else if (result.foundLink?.matched === false) {
      // Site is accessible but no matching link found
      online_status = 2;
    } else {
      // Site is accessible and matching link found
      online_status = 1;
    }

    return {
      netlink_id: Number(result.netlinkId),
      link_type,
      online_status,
    };
  }

  /**
   * Post batch results to the upsert endpoint
   */
  async postBatchResults(results: ScrapedNetlinkData[]): Promise<void> {
    try {
      // Transform results to additional info format
      const items: NetlinkAdditionalInfo[] = results
        .map(result => this.transformToAdditionalInfo(result))
        .filter((item): item is NetlinkAdditionalInfo => item !== null);

      if (items.length === 0) {
        this.logger.warn('No valid items to upsert');
        return;
      }

      const requestBody: BatchUpsertRequest = { items };

      this.logger.log(`Posting ${items.length} items to /netlink/additionalInfo/upsert`);
      this.logger.debug(`Request body: ${JSON.stringify(requestBody, null, 2)}`);

      // Post to the endpoint
      const response = await this.dashboardClient.post(
        '/netlink/additionalInfo/upsert',
        requestBody
      );

      this.logger.log(`✓ Batch upsert successful: ${JSON.stringify(response)}`);
    } catch (error) {
      this.logger.error(`Failed to post batch results: ${error.message}`);
      if (error.response) {
        this.logger.error(`Response data: ${JSON.stringify(error.response.data)}`);
      }
      throw error;
    }
  }

  /**
   * Helper function to normalize URL for comparison
   */
  private normalizeUrl(url: string): string {
    try {
      let normalized = url.toLowerCase().trim();

      // Remove protocol
      normalized = normalized.replace(/^https?:\/\//, '');
      // Remove www.
      normalized = normalized.replace(/^www\./, '');
      // Remove trailing slash
      normalized = normalized.replace(/\/$/, '');
      // Remove query params and hash
      normalized = normalized.split('?')[0].split('#')[0];

      return normalized;
    } catch (error) {
      return url.toLowerCase().trim();
    }
  }

  /**
   * Check if a link URL matches the landing page URL
   */
  private doesUrlMatch(linkHref: string, landingPage: string): { matched: boolean; matchType?: 'exact' | 'domain' | 'subdomain' } {
    if (!linkHref || !landingPage) {
      return { matched: false };
    }

    const normalizedLink = this.normalizeUrl(linkHref);
    const normalizedLanding = this.normalizeUrl(landingPage);

    // Exact match
    if (normalizedLink === normalizedLanding) {
      return { matched: true, matchType: 'exact' };
    }

    // Domain match (link contains landing page domain)
    if (normalizedLink.includes(normalizedLanding)) {
      return { matched: true, matchType: 'domain' };
    }

    // Subdomain match (landing page might be subdomain)
    if (normalizedLanding.includes(normalizedLink)) {
      return { matched: true, matchType: 'subdomain' };
    }

    // Extract just the domain (without path)
    const getLandingDomain = (url: string) => {
      return url.split('/')[0];
    };

    const linkDomain = getLandingDomain(normalizedLink);
    const landingDomain = getLandingDomain(normalizedLanding);

    if (linkDomain === landingDomain) {
      return { matched: true, matchType: 'domain' };
    }

    return { matched: false };
  }

  /**
   * Extract data from a page - Find <a> tag containing landing_page URL
   */
  private async extractData(page: Page, url: string, landingPage?: string): Promise<Partial<ScrapedNetlinkData>> {
    try {
      // Wait for page to load
      await page.waitForSelector('body', { timeout: 5000 });

      // Get all links from the page with rel attribute
      const linksData = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a'));
        return links.map(link => ({
          href: link.href,
          text: link.textContent?.trim() || '',
          outerHTML: link.outerHTML,
          rel: link.getAttribute('rel') || '',
        }));
      });

      this.logger.debug(`Found ${linksData.length} links on page ${url}`);

      // If no landing page provided, return all links
      if (!landingPage) {
        return {
          allLinksCount: linksData.length,
          foundLink: undefined,
        };
      }

      // Find matching link
      for (const link of linksData) {
        const matchResult = this.doesUrlMatch(link.href, landingPage);

        if (matchResult.matched) {
          this.logger.log(`✓ Found matching link: ${link.href} (${matchResult.matchType} match)`);

          // Determine link_type based on rel attribute
          let link_type = 'DoFollow'; // Default if no rel attribute

          if (link.rel) {
            // If rel exists, use its value (can be space-separated like "nofollow ugc")
            link_type = link.rel.trim();
          }

          return {
            allLinksCount: linksData.length,
            foundLink: {
              href: link.href,
              text: link.text,
              outerHTML: link.outerHTML,
              matched: true,
              matchType: matchResult.matchType,
              rel: link.rel || undefined,
              link_type: link_type,
            },
          };
        }
      }

      // No matching link found
      this.logger.warn(`No matching link found for landing page: ${landingPage}`);

      return {
        allLinksCount: linksData.length,
        foundLink: {
          href: '',
          text: '',
          outerHTML: '',
          matched: false,
        },
      };

    } catch (error) {
      this.logger.error(`Error extracting data from ${url}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Scrape a single netlink URL
   */
  async scrapeNetlink(
    url: string,
    landingPage?: string,
    options?: Pick<ScrapeOptions, 'timeout' | 'retries'>
  ): Promise<ScrapedNetlinkData> {
    const { timeout = 30000, retries = 3 } = options || {};

    let lastError: Error;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        this.logger.debug(`Scraping ${url} (attempt ${attempt}/${retries})`);

        const scrapedData = await this.lightpanda.withPage(async (page) => {
          // Set timeout for page operations
          page.setDefaultTimeout(timeout);

          // Navigate to URL
          await page.goto(url, {
            waitUntil: 'domcontentloaded',
            timeout,
          });

          // Extract data using the extractData method
          const extractedData = await this.extractData(page, url, landingPage);

          return extractedData;
        });

        // Return successful result
        return {
          url,
          landingPage,
          scrapedAt: new Date().toISOString(),
          success: true,
          ...scrapedData,
        };

      } catch (error) {
        lastError = error;
        this.logger.warn(
          `Attempt ${attempt}/${retries} failed for ${url}: ${error.message}`
        );

        if (attempt < retries) {
          // Wait before retry (exponential backoff)
          const delay = 1000 * Math.pow(2, attempt - 1);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // All retries failed
    this.logger.error(`Failed to scrape ${url} after ${retries} attempts`);
    return {
      url,
      landingPage,
      scrapedAt: new Date().toISOString(),
      success: false,
      error: lastError.message,
    };
  }

  /**
   * Scrape multiple netlinks with concurrency control
   *
   * Supports concurrent scraping with local Lightpanda browser.
   * Each scraping operation runs in its own isolated browser context.
   */
  async scrapeNetlinks(
    netlinks: NetlinkItem[],
    options?: ScrapeOptions
  ): Promise<ScrapedNetlinkData[]> {
    const {
      concurrency = 3,
      timeout = 30000,
      retries = 3,
      delay = 1000,
      skipErrors = true,
      onProgress,
      onSuccess,
      onError,
    } = options || {};

    this.logger.log(`Starting to scrape ${netlinks.length} netlinks with concurrency ${concurrency}`);

    const results: ScrapedNetlinkData[] = [];
    const queue = [...netlinks];
    let completed = 0;
    let activeWorkers = 0;

    return new Promise((resolve, reject) => {
      const worker = async () => {
        while (queue.length > 0) {
          const netlink = queue.shift();
          if (!netlink) break;

          activeWorkers++;
          completed++;

          // Extract URL from netlink - using url_bought field
          const url = netlink.url_bought || netlink.url || netlink.link || netlink.href;

          if (!url) {
            this.logger.warn(`Netlink has no URL property: ${JSON.stringify(netlink)}`);
            activeWorkers--;
            continue;
          }

          try {
            // Progress callback
            if (onProgress) {
              onProgress(completed, netlinks.length, url);
            }

            // Extract landing_page from netlink
            const landingPage = netlink.landing_page;

            // Scrape the netlink with landing_page
            const result = await this.scrapeNetlink(url, landingPage, { timeout, retries });

            // Add netlink ID if available
            if (netlink.id) {
              result.netlinkId = netlink.id;
            }

            results.push(result);

            // Success callback
            if (result.success && onSuccess) {
              await onSuccess(result);
            }

            // Error callback
            if (!result.success && onError) {
              await onError(url, new Error(result.error));
            }

          } catch (error) {
            this.logger.error(`Unexpected error scraping ${url}: ${error.message}`);

            const errorResult: ScrapedNetlinkData = {
              url,
              netlinkId: netlink.id,
              scrapedAt: new Date().toISOString(),
              success: false,
              error: error.message,
            };

            results.push(errorResult);

            if (onError) {
              await onError(url, error);
            }

            if (!skipErrors) {
              reject(error);
              return;
            }
          }

          // Delay between requests
          if (delay > 0 && queue.length > 0) {
            await new Promise(resolve => setTimeout(resolve, delay));
          }

          activeWorkers--;
        }

        // All workers finished
        if (activeWorkers === 0 && queue.length === 0) {
          resolve(results);
        }
      };

      // Start workers
      const workerCount = Math.min(concurrency, netlinks.length);
      for (let i = 0; i < workerCount; i++) {
        worker().catch(reject);
      }
    });
  }

  /**
   * Scrape all netlinks from the dashboard API
   */
  async scrapeAllNetlinks(options?: ScrapeOptions): Promise<ScrapingStats> {
    const startTime = new Date();
    const stats: ScrapingStats = {
      total: 0,
      successful: 0,
      failed: 0,
      skipped: 0,
      duration: 0,
      startTime,
      errors: [],
    };

    try {
      this.logger.log('Fetching netlinks from dashboard...');

      // Fetch all netlinks
      const netlinks = await this.netlinkService.fetchAllNetlinks({
        limit: 100,
        onProgress: (page, totalPages, itemCount) => {
          this.logger.log(`Fetching netlinks: Page ${page}/${totalPages} (${itemCount} items)`);
        },
      });

      stats.total = netlinks.length;
      this.logger.log(`Fetched ${netlinks.length} netlinks. Starting scraping...`);

      // Scrape all netlinks
      const results = await this.scrapeNetlinks(netlinks, {
        ...options,
        onProgress: (current, total, url) => {
          const percentage = ((current / total) * 100).toFixed(1);
          this.logger.log(`Progress: ${percentage}% (${current}/${total}) - ${url}`);

          if (options?.onProgress) {
            options.onProgress(current, total, url);
          }
        },
        onSuccess: async (data) => {
          stats.successful++;
          if (options?.onSuccess) {
            await options.onSuccess(data);
          }
        },
        onError: async (url, error) => {
          stats.failed++;
          stats.errors.push({ url, error: error.message });
          if (options?.onError) {
            await options.onError(url, error);
          }
        },
      });

      stats.endTime = new Date();
      stats.duration = stats.endTime.getTime() - startTime.getTime();

      this.logger.log('='.repeat(60));
      this.logger.log('SCRAPING COMPLETED');
      this.logger.log('='.repeat(60));
      this.logger.log(`Total: ${stats.total}`);
      this.logger.log(`Successful: ${stats.successful}`);
      this.logger.log(`Failed: ${stats.failed}`);
      this.logger.log(`Duration: ${(stats.duration / 1000).toFixed(2)}s`);
      this.logger.log('='.repeat(60));

      return stats;

    } catch (error) {
      this.logger.error(`Error in scrapeAllNetlinks: ${error.message}`);
      stats.endTime = new Date();
      stats.duration = stats.endTime.getTime() - startTime.getTime();
      throw error;
    }
  }

  /**
   * Scrape netlinks in batches (memory efficient)
   */
  async scrapeInBatches(
    batchSize: number,
    onBatchComplete: (results: ScrapedNetlinkData[], batchNumber: number) => Promise<void>,
    options?: ScrapeOptions
  ): Promise<ScrapingStats> {
    const startTime = new Date();
    const stats: ScrapingStats = {
      total: 0,
      successful: 0,
      failed: 0,
      skipped: 0,
      duration: 0,
      startTime,
      errors: [],
    };

    try {
      this.logger.log(`Starting batch scraping with batch size ${batchSize}`);

      let batchNumber = 0;

      // Fetch and scrape in batches
      await this.netlinkService.fetchInBatches(
        10, // 10 pages per batch of netlinks
        async (netlinkBatch, _batchNum) => {
          batchNumber++;
          stats.total += netlinkBatch.length;

          this.logger.log(`Processing batch ${batchNumber}: ${netlinkBatch.length} netlinks`);

          // Scrape this batch
          const results = await this.scrapeNetlinks(netlinkBatch, {
            ...options,
            onSuccess: (data) => {
              stats.successful++;
              if (options?.onSuccess) options.onSuccess(data);
            },
            onError: (url, error) => {
              stats.failed++;
              stats.errors.push({ url, error: error.message });
              if (options?.onError) options.onError(url, error);
            },
          });

          // Process batch results
          await onBatchComplete(results, batchNumber);

          this.logger.log(
            `Batch ${batchNumber} complete: ${results.filter(r => r.success).length}/${results.length} successful`
          );
        },
        { limit: 100 }
      );

      stats.endTime = new Date();
      stats.duration = stats.endTime.getTime() - startTime.getTime();

      this.logger.log('='.repeat(60));
      this.logger.log('BATCH SCRAPING COMPLETED');
      this.logger.log('='.repeat(60));
      this.logger.log(`Total: ${stats.total}`);
      this.logger.log(`Successful: ${stats.successful}`);
      this.logger.log(`Failed: ${stats.failed}`);
      this.logger.log(`Duration: ${(stats.duration / 1000).toFixed(2)}s`);
      this.logger.log('='.repeat(60));

      return stats;

    } catch (error) {
      this.logger.error(`Error in scrapeInBatches: ${error.message}`);
      stats.endTime = new Date();
      stats.duration = stats.endTime.getTime() - startTime.getTime();
      throw error;
    }
  }

  /**
   * Test scraping on a sample of netlinks
   */
  async testScraping(sampleSize: number = 5): Promise<ScrapedNetlinkData[]> {
    this.logger.log(`Testing scraping on ${sampleSize} sample netlinks...`);

    // Fetch first page
    const firstPage = await this.netlinkService.fetchPage(1, sampleSize);
    const sampleNetlinks = firstPage.data.slice(0, sampleSize);

    this.logger.log(`Sample netlinks fetched: ${sampleNetlinks.length}`);

    // Scrape sample
    const results = await this.scrapeNetlinks(sampleNetlinks, {
      concurrency: 1,
      timeout: 30000,
      retries: 2,
      onProgress: (current, total, url) => {
        this.logger.log(`Test ${current}/${total}: ${url}`);
      },
    });

    const successful = results.filter(r => r.success).length;
    this.logger.log(`Test complete: ${successful}/${results.length} successful`);

    return results;
  }
}
