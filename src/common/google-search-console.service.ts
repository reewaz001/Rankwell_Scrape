import { Injectable, Logger } from '@nestjs/common';
import { google, searchconsole_v1 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Search Analytics Request Options
 */
export interface SearchAnalyticsOptions {
  siteUrl: string;
  startDate: string; // Format: YYYY-MM-DD
  endDate: string; // Format: YYYY-MM-DD
  dimensions?: ('query' | 'page' | 'country' | 'device' | 'date' | 'searchAppearance')[];
  dimensionFilterGroups?: any[];
  aggregationType?: 'auto' | 'byProperty' | 'byPage';
  rowLimit?: number;
  startRow?: number;
}

/**
 * Search Analytics Response
 */
export interface SearchAnalyticsRow {
  keys?: string[];
  clicks?: number;
  impressions?: number;
  ctr?: number;
  position?: number;
}

export interface SearchAnalyticsResponse {
  rows?: SearchAnalyticsRow[];
  responseAggregationType?: string;
}

/**
 * URL Inspection Request
 */
export interface UrlInspectionRequest {
  siteUrl: string;
  inspectionUrl: string;
}

/**
 * Sitemap Info
 */
export interface SitemapInfo {
  path?: string;
  lastSubmitted?: string;
  isPending?: boolean;
  isSitemapsIndex?: boolean;
  type?: string;
  errors?: string;
  warnings?: string;
  contents?: any[];
}

/**
 * Google Search Console Service
 *
 * This service provides methods to interact with Google Search Console API
 * for fetching search analytics, URL inspection, sitemaps, and more.
 *
 * Authentication Methods:
 * 1. Service Account (recommended for server-to-server): Set GOOGLE_SERVICE_ACCOUNT_KEY_PATH
 * 2. OAuth2 (for user authorization): Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI
 *
 * Environment Variables:
 * - GOOGLE_SERVICE_ACCOUNT_KEY_PATH: Path to service account JSON key file
 * - GOOGLE_CLIENT_ID: OAuth2 client ID
 * - GOOGLE_CLIENT_SECRET: OAuth2 client secret
 * - GOOGLE_REDIRECT_URI: OAuth2 redirect URI
 * - GOOGLE_REFRESH_TOKEN: OAuth2 refresh token (optional, for stored credentials)
 */
@Injectable()
export class GoogleSearchConsoleService {
  private readonly logger = new Logger(GoogleSearchConsoleService.name);
  private searchConsole: searchconsole_v1.Searchconsole | null = null;
  private auth: OAuth2Client | any;
  private initializationPromise: Promise<void>;

  constructor() {
    // Initialize on service creation
    this.initializationPromise = this.initializeAuth();
  }

  /**
   * Ensure the service is initialized before use
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.searchConsole) {
      await this.initializationPromise;
    }
    if (!this.searchConsole) {
      throw new Error('Google Search Console service not initialized. Check your credentials.');
    }
  }

  /**
   * Initialize authentication
   */
  private async initializeAuth(): Promise<void> {
    try {
      // Try Service Account first (recommended for server-to-server)
      const serviceAccountPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH;

      if (serviceAccountPath) {
        this.logger.log('Initializing with Service Account...');
        await this.initializeServiceAccountAuth(serviceAccountPath);
        return;
      }

      // Fall back to OAuth2
      const clientId = process.env.GOOGLE_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
      const redirectUri = process.env.GOOGLE_REDIRECT_URI;

      if (clientId && clientSecret && redirectUri) {
        this.logger.log('Initializing with OAuth2...');
        await this.initializeOAuth2(clientId, clientSecret, redirectUri);
        return;
      }

      throw new Error(
        'No authentication method configured. Please set either GOOGLE_SERVICE_ACCOUNT_KEY_PATH or OAuth2 credentials.'
      );
    } catch (error) {
      this.logger.error(`Authentication initialization failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Initialize Service Account authentication
   */
  private async initializeServiceAccountAuth(keyFilePath: string): Promise<void> {
    try {
      const keyFile = await fs.readFile(keyFilePath, 'utf8');
      const credentials = JSON.parse(keyFile);

      this.auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
      });

      this.searchConsole = google.searchconsole({
        version: 'v1',
        auth: this.auth,
      });

      this.logger.log('✓ Service Account authentication initialized');
    } catch (error) {
      this.logger.error(`Failed to initialize Service Account: ${error.message}`);
      throw error;
    }
  }

  /**
   * Initialize OAuth2 authentication
   */
  private async initializeOAuth2(
    clientId: string,
    clientSecret: string,
    redirectUri: string
  ): Promise<void> {
    try {
      this.auth = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

      // If refresh token is available, set it
      const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
      if (refreshToken) {
        this.auth.setCredentials({
          refresh_token: refreshToken,
        });
      }

      this.searchConsole = google.searchconsole({
        version: 'v1',
        auth: this.auth,
      });

      this.logger.log('✓ OAuth2 authentication initialized');
    } catch (error) {
      this.logger.error(`Failed to initialize OAuth2: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate OAuth2 authorization URL
   * Use this to get the authorization URL for user consent
   */
  async getAuthorizationUrl(): Promise<string> {
    if (!this.auth || !(this.auth instanceof OAuth2Client)) {
      throw new Error('OAuth2 client not initialized');
    }

    const authUrl = this.auth.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/webmasters.readonly'],
    });

    return authUrl;
  }

  /**
   * Exchange authorization code for tokens
   */
  async getTokensFromCode(code: string): Promise<any> {
    if (!this.auth || !(this.auth instanceof OAuth2Client)) {
      throw new Error('OAuth2 client not initialized');
    }

    const { tokens } = await this.auth.getToken(code);
    this.auth.setCredentials(tokens);

    this.logger.log('✓ Tokens obtained and set');
    return tokens;
  }

  /**
   * Get list of sites (properties) accessible to the user
   */
  async getSitesList(): Promise<any[]> {
    try {
      await this.ensureInitialized();
      this.logger.log('Fetching sites list...');

      const response = await this.searchConsole!.sites.list();
      const sites = response.data.siteEntry || [];

      this.logger.log(`✓ Found ${sites.length} sites`);
      return sites;
    } catch (error) {
      this.logger.error(`Failed to fetch sites list: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get search analytics data
   *
   * Example usage:
   * const data = await gscService.getSearchAnalytics({
   *   siteUrl: 'https://example.com/',
   *   startDate: '2024-01-01',
   *   endDate: '2024-01-31',
   *   dimensions: ['query', 'page'],
   *   rowLimit: 1000
   * });
   */
  async getSearchAnalytics(options: SearchAnalyticsOptions): Promise<SearchAnalyticsResponse> {
    try {
      await this.ensureInitialized();

      const {
        siteUrl,
        startDate,
        endDate,
        dimensions = ['query'],
        dimensionFilterGroups,
        aggregationType = 'auto',
        rowLimit = 1000,
        startRow = 0,
      } = options;

      this.logger.log(`Fetching search analytics for ${siteUrl} (${startDate} to ${endDate})...`);

      const response = await this.searchConsole!.searchanalytics.query({
        siteUrl,
        requestBody: {
          startDate,
          endDate,
          dimensions,
          dimensionFilterGroups,
          aggregationType,
          rowLimit,
          startRow,
        },
      });

      const rows = response.data.rows || [];
      this.logger.log(`✓ Fetched ${rows.length} rows of search analytics data`);

      return {
        rows,
        responseAggregationType: response.data.responseAggregationType,
      };
    } catch (error) {
      this.logger.error(`Failed to fetch search analytics: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get search analytics with pagination support
   * Automatically handles pagination to fetch all results
   */
  async getSearchAnalyticsPaginated(
    options: SearchAnalyticsOptions,
    onProgress?: (currentRows: number, totalFetched: number) => void
  ): Promise<SearchAnalyticsRow[]> {
    const allRows: SearchAnalyticsRow[] = [];
    const rowLimit = options.rowLimit || 25000; // Max per request
    let startRow = 0;
    let hasMore = true;

    this.logger.log(`Starting paginated fetch for ${options.siteUrl}...`);

    while (hasMore) {
      const response = await this.getSearchAnalytics({
        ...options,
        rowLimit,
        startRow,
      });

      const rows = response.rows || [];
      allRows.push(...rows);

      if (onProgress) {
        onProgress(rows.length, allRows.length);
      }

      this.logger.log(`  Fetched ${rows.length} rows (total: ${allRows.length})`);

      // Check if there are more results
      if (rows.length < rowLimit) {
        hasMore = false;
      } else {
        startRow += rowLimit;
      }
    }

    this.logger.log(`✓ Pagination complete. Total rows: ${allRows.length}`);
    return allRows;
  }

  /**
   * Get URL inspection data
   * Note: This requires the URL Inspection API which may need additional setup
   */
  async inspectUrl(request: UrlInspectionRequest): Promise<any> {
    try {
      this.logger.log(`Inspecting URL: ${request.inspectionUrl}`);

      // Note: URL Inspection API might require different authentication
      // This is a placeholder - actual implementation depends on API availability
      this.logger.warn('URL Inspection API requires additional setup');

      throw new Error('URL Inspection API not yet implemented in googleapis library');
    } catch (error) {
      this.logger.error(`Failed to inspect URL: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get sitemaps for a site
   */
  async getSitemaps(siteUrl: string): Promise<SitemapInfo[]> {
    try {
      await this.ensureInitialized();
      this.logger.log(`Fetching sitemaps for ${siteUrl}...`);

      const response = await this.searchConsole!.sitemaps.list({
        siteUrl,
      });

      const sitemaps = response.data.sitemap || [];
      this.logger.log(`✓ Found ${sitemaps.length} sitemaps`);

      return sitemaps;
    } catch (error) {
      this.logger.error(`Failed to fetch sitemaps: ${error.message}`);
      throw error;
    }
  }

  /**
   * Submit a sitemap
   */
  async submitSitemap(siteUrl: string, feedpath: string): Promise<void> {
    try {
      await this.ensureInitialized();
      this.logger.log(`Submitting sitemap ${feedpath} for ${siteUrl}...`);

      await this.searchConsole!.sitemaps.submit({
        siteUrl,
        feedpath,
      });

      this.logger.log('✓ Sitemap submitted successfully');
    } catch (error) {
      this.logger.error(`Failed to submit sitemap: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete a sitemap
   */
  async deleteSitemap(siteUrl: string, feedpath: string): Promise<void> {
    try {
      await this.ensureInitialized();
      this.logger.log(`Deleting sitemap ${feedpath} for ${siteUrl}...`);

      await this.searchConsole!.sitemaps.delete({
        siteUrl,
        feedpath,
      });

      this.logger.log('✓ Sitemap deleted successfully');
    } catch (error) {
      this.logger.error(`Failed to delete sitemap: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get top queries for a site
   */
  async getTopQueries(
    siteUrl: string,
    startDate: string,
    endDate: string,
    limit: number = 100
  ): Promise<SearchAnalyticsRow[]> {
    try {
      this.logger.log(`Fetching top ${limit} queries for ${siteUrl}...`);

      const response = await this.getSearchAnalytics({
        siteUrl,
        startDate,
        endDate,
        dimensions: ['query'],
        rowLimit: limit,
      });

      return response.rows || [];
    } catch (error) {
      this.logger.error(`Failed to fetch top queries: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get top pages for a site
   */
  async getTopPages(
    siteUrl: string,
    startDate: string,
    endDate: string,
    limit: number = 100
  ): Promise<SearchAnalyticsRow[]> {
    try {
      this.logger.log(`Fetching top ${limit} pages for ${siteUrl}...`);

      const response = await this.getSearchAnalytics({
        siteUrl,
        startDate,
        endDate,
        dimensions: ['page'],
        rowLimit: limit,
      });

      return response.rows || [];
    } catch (error) {
      this.logger.error(`Failed to fetch top pages: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get performance by country
   */
  async getPerformanceByCountry(
    siteUrl: string,
    startDate: string,
    endDate: string
  ): Promise<SearchAnalyticsRow[]> {
    try {
      this.logger.log(`Fetching performance by country for ${siteUrl}...`);

      const response = await this.getSearchAnalytics({
        siteUrl,
        startDate,
        endDate,
        dimensions: ['country'],
        rowLimit: 1000,
      });

      return response.rows || [];
    } catch (error) {
      this.logger.error(`Failed to fetch performance by country: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get performance by device
   */
  async getPerformanceByDevice(
    siteUrl: string,
    startDate: string,
    endDate: string
  ): Promise<SearchAnalyticsRow[]> {
    try {
      this.logger.log(`Fetching performance by device for ${siteUrl}...`);

      const response = await this.getSearchAnalytics({
        siteUrl,
        startDate,
        endDate,
        dimensions: ['device'],
        rowLimit: 10,
      });

      return response.rows || [];
    } catch (error) {
      this.logger.error(`Failed to fetch performance by device: ${error.message}`);
      throw error;
    }
  }
}
