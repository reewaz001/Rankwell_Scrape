import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance, AxiosError } from 'axios';

/**
 * DomDetailer API Response Interface
 */
export interface DomDetailerData {
  [key: string]: any;
}

/**
 * DomDetailer Service Result
 */
export interface DomDetailerResult {
  url: string;
  success: boolean;
  data?: DomDetailerData;
  error?: string;
  checkedAt: string;
}

/**
 * DomDetailer Service Configuration
 */
export interface DomDetailerConfig {
  baseUrl?: string;
  app?: string;
  apiKey?: string;
  majesticChoice?: string;
  timeout?: number;
}

/**
 * DomDetailer Service
 *
 * TypeScript service for checking domain information using the DomDetailer API.
 * This service provides methods to check single or multiple domains with
 * concurrency control and error handling.
 *
 * @example
 * ```typescript
 * const domDetailer = new DomDetailerService();
 * const result = await domDetailer.checkDomain('example.com');
 * console.log(result.data);
 * ```
 */
@Injectable()
export class DomDetailerService {
  private readonly logger = new Logger(DomDetailerService.name);
  private readonly axiosInstance: AxiosInstance;
  private readonly config: Required<DomDetailerConfig>;

  constructor() {
    // Default configuration
    this.config = {
      baseUrl: 'https://domdetailer.com/api/',
      app: 'rankwell',
      apiKey: '5MJUXJ1XZVIP9',
      majesticChoice: 'asis',
      timeout: 30000,
    };

    // Create axios instance with default config
    this.axiosInstance = axios.create({
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.logger.log('DomDetailer service initialized');
  }

  /**
   * Configure the service (optional, for advanced use cases)
   * Call this after construction if you need custom configuration
   */
  configure(config: Partial<DomDetailerConfig>): void {
    if (config.baseUrl) this.config.baseUrl = config.baseUrl;
    if (config.app) this.config.app = config.app;
    if (config.apiKey) this.config.apiKey = config.apiKey;
    if (config.majesticChoice) this.config.majesticChoice = config.majesticChoice;
    if (config.timeout) this.config.timeout = config.timeout;

    // Recreate axios instance with new config
    Object.assign(this.axiosInstance.defaults, {
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout,
    });

    this.logger.log('DomDetailer service reconfigured');
  }

  /**
   * Extract domain from URL
   */
  private extractDomain(url: string): string {
    try {
      // Remove protocol
      let domain = url.replace(/^https?:\/\//, '');
      // Remove www.
      domain = domain.replace(/^www\./, '');
      // Remove path and query
      domain = domain.split('/')[0].split('?')[0];
      return domain;
    } catch (error) {
      return url;
    }
  }

  /**
   * Build API URL with parameters
   */
  private buildApiUrl(domain: string): string {
    const params = new URLSearchParams({
      domain: domain,
      app: this.config.app,
      apikey: this.config.apiKey,
      majesticChoice: this.config.majesticChoice,
    });

    return `checkDomain.php?${params.toString()}`;
  }

  /**
   * Check a single domain using the DomDetailer API
   *
   * @param url - The URL or domain to check
   * @returns Promise resolving to DomDetailerResult
   *
   * @example
   * ```typescript
   * const result = await domDetailer.checkDomain('example.com');
   * if (result.success) {
   *   console.log('Domain data:', result.data);
   * }
   * ```
   */
  async checkDomain(url: string): Promise<DomDetailerResult> {
    const checkedAt = new Date().toISOString();

    try {
      this.logger.debug(`Checking domain via DomDetailer: ${url}`);

      // Extract domain from URL
      const domain = this.extractDomain(url);

      // Build API URL
      const apiUrl = this.buildApiUrl(domain);

      // Make API request
      const response = await this.axiosInstance.get(apiUrl);

      this.logger.debug(`DomDetailer check successful for ${url}`);

      return {
        url,
        success: true,
        data: response.data,
        checkedAt,
      };
    } catch (error) {
      const errorMessage = this.getErrorMessage(error);
      this.logger.error(`DomDetailer check failed for ${url}: ${errorMessage}`);

      return {
        url,
        success: false,
        error: errorMessage,
        checkedAt,
      };
    }
  }

  /**
   * Check multiple domains in batch (sequential)
   *
   * @param urls - Array of URLs to check
   * @param delayMs - Delay between requests in milliseconds (default: 500)
   * @returns Promise resolving to array of DomDetailerResult
   *
   * @example
   * ```typescript
   * const results = await domDetailer.checkDomainsBatch(['example.com', 'test.com']);
   * ```
   */
  async checkDomainsBatch(
    urls: string[],
    delayMs: number = 500
  ): Promise<DomDetailerResult[]> {
    this.logger.log(`Checking ${urls.length} domains via DomDetailer (sequential)...`);

    const results: DomDetailerResult[] = [];

    for (const url of urls) {
      const result = await this.checkDomain(url);
      results.push(result);

      // Small delay between requests to avoid rate limiting
      if (urls.indexOf(url) < urls.length - 1) {
        await this.delay(delayMs);
      }
    }

    const successful = results.filter(r => r.success).length;
    this.logger.log(
      `DomDetailer batch check complete: ${successful}/${urls.length} successful`
    );

    return results;
  }

  /**
   * Check multiple domains with concurrency control
   *
   * @param urls - Array of URLs to check
   * @param concurrency - Number of concurrent requests (default: 3)
   * @param delayMs - Delay between requests in milliseconds (default: 500)
   * @returns Promise resolving to array of DomDetailerResult
   *
   * @example
   * ```typescript
   * const results = await domDetailer.checkDomainsBatchConcurrent(
   *   ['example.com', 'test.com', 'demo.com'],
   *   3
   * );
   * ```
   */
  async checkDomainsBatchConcurrent(
    urls: string[],
    concurrency: number = 3,
    delayMs: number = 500
  ): Promise<DomDetailerResult[]> {
    this.logger.log(
      `Checking ${urls.length} domains via DomDetailer (concurrency: ${concurrency})...`
    );

    const results: DomDetailerResult[] = [];
    const queue = [...urls];

    return new Promise((resolve) => {
      let activeWorkers = 0;
      let completed = 0;

      const worker = async () => {
        while (queue.length > 0) {
          const url = queue.shift();
          if (!url) break;

          activeWorkers++;

          try {
            const result = await this.checkDomain(url);
            results.push(result);
          } catch (error) {
            // This shouldn't happen as checkDomain handles errors,
            // but just in case
            this.logger.error(`Unexpected error checking ${url}: ${error.message}`);
            results.push({
              url,
              success: false,
              error: error.message,
              checkedAt: new Date().toISOString(),
            });
          }

          completed++;

          // Small delay between requests
          if (queue.length > 0) {
            await this.delay(delayMs);
          }

          activeWorkers--;
        }

        // All workers finished
        if (activeWorkers === 0 && queue.length === 0) {
          const successful = results.filter(r => r.success).length;
          this.logger.log(
            `DomDetailer batch check complete: ${successful}/${urls.length} successful`
          );
          resolve(results);
        }
      };

      // Start workers
      const workerCount = Math.min(concurrency, urls.length);
      for (let i = 0; i < workerCount; i++) {
        worker();
      }
    });
  }

  /**
   * Get a map of URL to DomDetailer result for easier lookup
   *
   * @param results - Array of DomDetailerResult
   * @returns Map of URL to result
   */
  getResultMap(results: DomDetailerResult[]): Map<string, DomDetailerResult> {
    return new Map(results.map(r => [r.url, r]));
  }

  /**
   * Extract error message from various error types
   */
  private getErrorMessage(error: unknown): string {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      if (axiosError.response) {
        // Server responded with error status
        return `API error: ${axiosError.response.status} - ${JSON.stringify(axiosError.response.data)}`;
      } else if (axiosError.request) {
        // Request made but no response received
        return `No response from API: ${axiosError.message}`;
      } else {
        // Error setting up request
        return `Request setup error: ${axiosError.message}`;
      }
    } else if (error instanceof Error) {
      return error.message;
    } else {
      return String(error);
    }
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
