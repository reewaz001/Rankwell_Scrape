import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import {
  AuthResponse,
  PaperClubAPIResponse,
  PaperClubSiteRaw,
} from '../interfaces/paperclub-site.interface';

/**
 * Paper.club API Service
 *
 * Handles authentication and API requests to Paper.club
 * Features:
 * - Automatic token management and refresh
 * - Pagination support
 * - Rate limiting with delays
 */
@Injectable()
export class PaperClubAPIService {
  private readonly logger = new Logger(PaperClubAPIService.name);
  private token: string | null = null;
  private tokenExpiry: Date | null = null;
  private sessionCookie: string | null = null; // Store PHPSESSID cookie
  private readonly baseUrl: string;
  private readonly email: string;
  private readonly password: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl = this.configService.get<string>(
      'PAPER_CLUB_API_URL',
      'https://app.paper.club/api',
    );
    this.email = this.configService.get<string>('PAPER_CLUB_EMAIL');
    this.password = this.configService.get<string>('PAPER_CLUB_PASSWORD');

    if (!this.email || !this.password) {
      throw new Error(
        'Paper.club credentials not found in environment variables',
      );
    }
  }

  /**
   * Authenticate with Paper.club API and obtain access token
   */
  async authenticate(): Promise<string> {
    try {
      this.logger.log(`Authenticating with Paper.club as: ${this.email}`);

      const response = await firstValueFrom(
        this.httpService.post<AuthResponse>(
          `${this.baseUrl}/authenticate`,
          {
            email: this.email,
            password: this.password,
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
          },
        ),
      );

      if (response.status === 200 && response.data.token) {
        this.token = response.data.token;
        // Set token expiry to 24 hours from now
        this.tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

        // Capture session cookie (PHPSESSID) from response
        const setCookieHeader = response.headers['set-cookie'];
        if (setCookieHeader) {
          const cookies = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
          for (const cookie of cookies) {
            if (cookie.includes('PHPSESSID')) {
              const match = cookie.match(/PHPSESSID=[^;]+/);
              if (match) {
                this.sessionCookie = match[0];
              }
            }
          }
        }

        this.logger.log('Successfully authenticated with Paper.club API');
        return this.token;
      } else {
        throw new Error('Authentication failed: No token received');
      }
    } catch (error) {
      this.logger.error(`Authentication error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Ensure valid token exists, refresh if expired
   */
  async ensureAuthenticated(): Promise<void> {
    if (!this.token || (this.tokenExpiry && new Date() >= this.tokenExpiry)) {
      this.logger.log('Token expired or missing, re-authenticating...');
      await this.authenticate();
    }
  }

  /**
   * Get HTTP headers with authentication token and session cookie
   */
  private getHeaders(): Record<string, string> {
    return {
      'Accept': 'application/json',
      'User-Agent': 'PostmanRuntime/7.36.0',
      ...(this.token && { Authorization: `Bearer ${this.token}` }),
      ...(this.sessionCookie && { Cookie: this.sessionCookie }),
    };
  }

  /**
   * Fetch a single page of sites for a specific category
   *
   * @param categoryId - Paper.club category ID
   * @param page - Page number (default: 1)
   * @param limit - Results per page (default: 100)
   */
  async fetchCategoryPage(
    categoryId: string,
    page: number = 1,
    limit: number = 100,
  ): Promise<PaperClubAPIResponse> {
    await this.ensureAuthenticated();

    // Build URL manually - use native fetch to avoid axios URL encoding issues
    const url = `${this.baseUrl}/advanced_search/site?to[]=${categoryId}&p=${page}&l=${limit}`;

    try {
      const headers = this.getHeaders();

      // Use native fetch instead of axios to preserve exact URL (axios encodes [] differently)
      const response = await fetch(url, {
        method: 'GET',
        headers,
      });

      const data = await response.json();

      if (response.status === 200) {
        return data as PaperClubAPIResponse;
      } else {
        this.logger.error(`API returned status ${response.status}`);
        this.logger.error(`Response data: ${JSON.stringify(data)}`);
        throw new Error(
          `API request failed with status: ${response.status} - ${JSON.stringify(data)}`,
        );
      }
    } catch (error) {
      this.logger.error(`Error fetching category page: ${error.message}`);
      throw error;
    }
  }

  /**
   * Fetch all pages for a specific category with pagination
   *
   * @param categoryId - Paper.club category ID
   * @param categoryName - Category name (for logging)
   * @param limit - Results per page (default: 100)
   * @param delay - Delay between requests in milliseconds (default: 300)
   */
  async fetchAllCategoryPages(
    categoryId: string,
    categoryName: string,
    limit: number = 100,
    delay: number = 300,
  ): Promise<PaperClubSiteRaw[]> {
    const allResults: PaperClubSiteRaw[] = [];
    let page = 1;
    let hasMore = true;

    this.logger.log(`Fetching all pages for category: ${categoryName}`);

    while (hasMore) {
      try {
        const responseData = await this.fetchCategoryPage(
          categoryId,
          page,
          limit,
        );
        const results = responseData.currentPageResults || [];

        if (results.length > 0) {
          allResults.push(...results);
          this.logger.log(
            `  ${categoryName} - Page ${page}: Found ${results.length} sites`,
          );
          page++;

          // Rate limiting delay
          await this.sleep(delay);
        } else {
          hasMore = false;
          this.logger.log(
            `  ${categoryName}: Complete. Total: ${allResults.length} sites`,
          );
        }
      } catch (error) {
        this.logger.error(
          `Error fetching page ${page} for ${categoryName}: ${error.message}`,
        );
        hasMore = false;
      }
    }

    return allResults;
  }

  /**
   * Sleep utility for rate limiting
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get current token (for debugging)
   */
  getToken(): string | null {
    return this.token;
  }
}
