import { Injectable, Logger } from '@nestjs/common';
import { DashboardHttpClient } from '../../../common/dashboard-http-client.service';

/**
 * Netlink Data Response Interface
 */
export interface NetlinkItem {
  // Define your netlink data structure here
  // Add properties based on your actual data
  [key: string]: any;
}

/**
 * Pagination Metadata Interface
 */
export interface PaginationMetadata {
  currentPage: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  remainingPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/**
 * Paginated Response Interface
 */
export interface PaginatedResponse<T = NetlinkItem> {
  data: T[];
  pagination: PaginationMetadata;
}

/**
 * Fetch Options Interface
 */
export interface FetchNetlinkOptions {
  limit?: number;
  startPage?: number;
  maxPages?: number;
  onPageFetched?: (page: number, totalPages: number, items: number) => void;
  onProgress?: (
    currentPage: number,
    totalPages: number,
    totalItems: number,
  ) => void;
}

/**
 * Netlink Service
 *
 * Service for fetching paginated netlink data from the Dashboard API.
 * Handles automatic pagination and combines results from all pages.
 *
 * Features:
 * - Automatic pagination through all pages
 * - Progress tracking callbacks
 * - Configurable page limits
 * - Error handling for individual pages
 * - Detailed logging
 */
@Injectable()
export class NetlinkService {
  private readonly logger = new Logger(NetlinkService.name);
  private readonly endpoint = '/netlink/all/paginated';

  constructor(private readonly dashboardClient: DashboardHttpClient) {}

  /**
   * Fetch all netlink data across all pages
   */
  async fetchAllNetlinks(
    options?: FetchNetlinkOptions,
  ): Promise<NetlinkItem[]> {
    const {
      limit = 100,
      startPage = 1,
      maxPages = Infinity,
      onPageFetched,
      onProgress,
    } = options || {};

    this.logger.log('Starting to fetch all netlink data...');
    this.logger.log(`Configuration: limit=${limit}, startPage=${startPage}`);

    const allData: NetlinkItem[] = [];
    let currentPage = startPage;
    let hasNextPage = true;
    let totalPages = 0;
    let pagesProcessed = 0;

    try {
      while (hasNextPage && pagesProcessed < maxPages) {
        // Fetch current page
        const response = await this.fetchPage(currentPage, limit);

        // Add data to collection
        allData.push(...response.data);

        // Update metadata
        totalPages = response.pagination.totalPages;
        hasNextPage = response.pagination.hasNextPage;
        pagesProcessed++;

        // Log progress
        this.logger.log(
          `Page ${currentPage}/${totalPages}: Fetched ${response.data.length} items ` +
            `(Total: ${allData.length}/${response.pagination.totalItems})`,
        );

        // Call progress callbacks
        if (onPageFetched) {
          onPageFetched(currentPage, totalPages, response.data.length);
        }

        if (onProgress) {
          onProgress(currentPage, totalPages, allData.length);
        }

        // Move to next page
        currentPage++;
      }

      this.logger.log(
        `Completed! Fetched ${allData.length} items across ${pagesProcessed} pages`,
      );
      return allData;
    } catch (error) {
      this.logger.error(`Error fetching netlink data: ${error.message}`);
      this.logger.error(
        `Partial data collected: ${allData.length} items from ${pagesProcessed} pages`,
      );
      throw error;
    }
  }

  /**
   * Fetch a single page of netlink data
   */
  async fetchPage(
    page: number,
    limit: number = 100,
  ): Promise<PaginatedResponse> {
    try {
      this.logger.debug(`Fetching page ${page} with limit ${limit}`);

      const response = await this.dashboardClient.get<PaginatedResponse>(
        this.endpoint,
        {
          params: {
            page,
            limit,
          },
        },
      );

      return response;
    } catch (error) {
      this.logger.error(`Failed to fetch page ${page}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Fetch netlinks with retry logic for failed pages
   */
  async fetchAllWithRetry(
    options?: FetchNetlinkOptions & { maxRetries?: number },
  ): Promise<NetlinkItem[]> {
    const { maxRetries = 3, ...fetchOptions } = options || {};

    let attempt = 0;
    let lastError: Error;

    while (attempt < maxRetries) {
      try {
        return await this.fetchAllNetlinks(fetchOptions);
      } catch (error) {
        lastError = error;
        attempt++;

        if (attempt < maxRetries) {
          const delay = 1000 * Math.pow(2, attempt - 1); // Exponential backoff
          this.logger.warn(
            `Attempt ${attempt} failed. Retrying in ${delay}ms... (${maxRetries - attempt} retries left)`,
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    this.logger.error(`All ${maxRetries} attempts failed`);
    throw lastError;
  }

  /**
   * Fetch netlinks in batches (useful for memory management with large datasets)
   */
  async fetchInBatches(
    batchSize: number,
    onBatchComplete: (
      batch: NetlinkItem[],
      batchNumber: number,
    ) => Promise<void>,
    options?: FetchNetlinkOptions,
  ): Promise<void> {
    const { limit = 100, startPage = 1 } = options || {};

    this.logger.log(`Fetching netlinks in batches of ${batchSize} pages`);

    let currentPage = startPage;
    let hasNextPage = true;
    let batchNumber = 1;
    let currentBatch: NetlinkItem[] = [];
    let pagesInCurrentBatch = 0;

    while (hasNextPage) {
      // Fetch page
      const response = await this.fetchPage(currentPage, limit);
      currentBatch.push(...response.data);
      pagesInCurrentBatch++;

      // Check if batch is complete
      if (
        pagesInCurrentBatch >= batchSize ||
        !response.pagination.hasNextPage
      ) {
        this.logger.log(
          `Batch ${batchNumber} complete: ${currentBatch.length} items from ${pagesInCurrentBatch} pages`,
        );

        // Process batch
        await onBatchComplete(currentBatch, batchNumber);

        // Reset batch
        currentBatch = [];
        pagesInCurrentBatch = 0;
        batchNumber++;
      }

      hasNextPage = response.pagination.hasNextPage;
      currentPage++;
    }

    this.logger.log(`All batches processed: ${batchNumber - 1} batches`);
  }

  /**
   * Get pagination info without fetching all data
   */
  async getPaginationInfo(limit: number = 100): Promise<PaginationMetadata> {
    const firstPage = await this.fetchPage(1, limit);
    return firstPage.pagination;
  }

  /**
   * Fetch specific page range
   */
  async fetchPageRange(
    startPage: number,
    endPage: number,
    limit: number = 100,
  ): Promise<NetlinkItem[]> {
    this.logger.log(`Fetching pages ${startPage} to ${endPage}`);

    const allData: NetlinkItem[] = [];

    for (let page = startPage; page <= endPage; page++) {
      try {
        const response = await this.fetchPage(page, limit);
        allData.push(...response.data);
        this.logger.log(`Page ${page}: Fetched ${response.data.length} items`);

        // Stop if we've reached the last page
        if (!response.pagination.hasNextPage) {
          this.logger.log(`Reached last page at page ${page}`);
          break;
        }
      } catch (error) {
        this.logger.error(`Failed to fetch page ${page}: ${error.message}`);
        // Continue with next page instead of failing completely
      }
    }

    this.logger.log(
      `Fetched ${allData.length} items from pages ${startPage}-${endPage}`,
    );
    return allData;
  }

  /**
   * Count total items without fetching all data
   */
  async getTotalCount(): Promise<number> {
    const info = await this.getPaginationInfo();
    return info.totalItems;
  }

  /**
   * Check if there's any data available
   */
  async hasData(): Promise<boolean> {
    try {
      const count = await this.getTotalCount();
      return count > 0;
    } catch (error) {
      this.logger.error(`Failed to check data availability: ${error.message}`);
      return false;
    }
  }
}
