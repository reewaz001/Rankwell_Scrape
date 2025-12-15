import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { NetlinkScraperService } from '../modules/paperclub/services/netlink-scraper.service';
import { DashboardHttpClient } from '../common/dashboard-http-client.service';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Test script for Netlink Scraper Service with REST API
 *
 * This script demonstrates:
 * 1. Fetching netlinks from the Dashboard API (/netlink/all/toScrape)
 * 2. Scraping the fetched netlinks with progress tracking
 * 3. Batch scraping with pagination support
 * 4. Saving results to file
 * 5. Posting results back to the API
 */

interface NetlinkFromAPI {
  id: string | number;
  url: string;
  landingPage?: string;
  [key: string]: any;
}

interface APIResponse {
  data: NetlinkFromAPI[];
  meta?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/**
 * Fetch netlinks from the API
 */
async function fetchNetlinksFromAPI(
  dashboardClient: DashboardHttpClient,
  page: number = 1,
  limit: number = 100
): Promise<APIResponse> {
  console.log(`\nFetching netlinks from API (page=${page}, limit=${limit})...`);

  try {
    const response = await dashboardClient.get<APIResponse>(
      `/netlink/all/toScrape?page=${page}&limit=${limit}`
    );

    const netlinkCount = response.data?.length || 0;
    console.log(`✓ Fetched ${netlinkCount} netlinks from API`);

    if (response.meta) {
      console.log(`  Total available: ${response.meta.total}`);
      console.log(`  Page ${response.meta.page} of ${response.meta.totalPages}`);
    }

    return response;
  } catch (error) {
    console.error('✗ Failed to fetch netlinks from API:', error.message);
    throw error;
  }
}

/**
 * Main test function - Fetch and scrape netlinks
 */
async function testNetlinkScraperWithREST() {
  // Global handler for unhandled promise rejections from playwright-extra stealth plugin
  // These CDP errors occur during cleanup and can be safely ignored
  process.on('unhandledRejection', (reason: any) => {
    const message = reason?.message || String(reason);

    // Suppress CDP session errors from playwright-extra cleanup
    if (message?.includes('cdpSession') ||
        message?.includes('Target page, context or browser has been closed') ||
        message?.includes('Session closed')) {
      console.log('[Suppressed CDP cleanup error]');
      return;
    }

    // Re-throw other unhandled rejections
    throw reason;
  });

  console.log('='.repeat(60));
  console.log('TESTING NETLINK SCRAPER SERVICE WITH REST API');
  console.log('='.repeat(60));

  const app = await NestFactory.createApplicationContext(AppModule);
  const scraperService = app.get(NetlinkScraperService);
  const dashboardClient = app.get(DashboardHttpClient);

  try {
    // Fetch netlinks from API
    const apiResponse = await fetchNetlinksFromAPI(dashboardClient, 1, 100);

    if (!apiResponse.data || apiResponse.data.length === 0) {
      console.log('\n⚠ No netlinks to scrape. Make sure there are netlinks marked as "toScrape" in the database.');
      return;
    }

    const netlinks = apiResponse.data;
    console.log(`\n1. Starting scrape for ${netlinks.length} netlinks...`);

    // Scrape the netlinks
    let results;
    try {
      results = await scraperService.scrapeNetlinks(netlinks, {
        concurrency: 3,
        timeout: 120000,
        retries: 2,
        delay: 500,
        skipErrors: true,
        enableDomDetailer: false,
        onProgress: (current, total, url) => {
          const percentage = ((current / total) * 100).toFixed(1);
          process.stdout.write(
            `\r   Progress: ${percentage}% (${current}/${total}) - ${url.slice(0, 50)}...`
          );
        },
      });
    } catch (error) {
      console.error('\n\n✗ Scraping failed:', error.message);
      throw error;
    }

    // Clear the progress line and show completion
    process.stdout.write('\r' + ' '.repeat(100) + '\r');
    console.log('\n✓ Scraping completed!');
    console.log(`   Collected ${results.length} results`);

    // Display results summary
    const successCount = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success).length;

    console.log('\nScraping Results:');
    console.log(`  Total: ${results.length}`);
    console.log(`  ✓ Successful: ${successCount}`);
    console.log(`  ✗ Failed: ${failedCount}`);

    // Show sample of successful results
    if (successCount > 0) {
      console.log('\nSample Successful Results:');
      results
        .filter(r => r.success)
        .slice(0, 3)
        .forEach((result, index) => {
          console.log(`\n  ${index + 1}. ${result.url}`);
          if (result.foundLink) {
            console.log(`     Found Link: ${result.foundLink.href}`);
            console.log(`     Link Text: ${result.foundLink.text}`);
            console.log(`     Match Type: ${result.foundLink.matchType}`);
            console.log(`     Rel: ${result.foundLink.rel || 'none'}`);
          }
        });
    }

    // Show sample of failed results
    if (failedCount > 0) {
      console.log('\nSample Failed Results:');
      results
        .filter(r => !r.success)
        .slice(0, 3)
        .forEach((result, index) => {
          console.log(`\n  ${index + 1}. ${result.url}`);
          console.log(`     Error: ${result.error}`);
        });
    }

    // Post results to batch upsert endpoint
    console.log('\n2. Posting results back to API...');
    console.log(`   Preparing ${results.length} results for batch upsert...`);

    try {
      await scraperService.postBatchResults(results);
      console.log('   ✓ Batch upsert completed successfully');
    } catch (error) {
      console.error('   ✗ Batch upsert failed:', error.message);
      console.error('   Stack:', error.stack);
      // Don't throw - we still want to show summary and exit gracefully
    }

    console.log('\n' + '='.repeat(60));
    console.log('SCRAPING COMPLETE');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n✗ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
    try {
      await app.close();
    } catch (closeError) {
      console.error('Error closing app:', closeError.message);
    }
    process.exit(1);
  }

  console.log('\nClosing application...');
  try {
    await Promise.race([
      app.close(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout closing app')), 5000))
    ]);
    console.log('✓ Application closed successfully');
  } catch (error) {
    console.error('✗ Error closing application:', error.message);
  }

  console.log('✓ Exiting...');
  process.exit(0);
}

/**
 * Batch scraping with pagination - Scrape all pages
 */
async function batchScrapeAllPages() {
  // Global handler for unhandled promise rejections from playwright-extra stealth plugin
  process.on('unhandledRejection', (reason: any) => {
    const message = reason?.message || String(reason);
    if (message?.includes('cdpSession') || message?.includes('Target page, context or browser has been closed') || message?.includes('Session closed')) {
      return; // Suppress CDP cleanup errors
    }
    throw reason;
  });

  console.log('\n' + '='.repeat(60));
  console.log('BATCH SCRAPING ALL PAGES FROM REST API');
  console.log('='.repeat(60));

  const app = await NestFactory.createApplicationContext(AppModule);
  const scraperService = app.get(NetlinkScraperService);
  const dashboardClient = app.get(DashboardHttpClient);

  try {
    const outputDir = path.join(process.cwd(), 'scraped-data');
    await fs.mkdir(outputDir, { recursive: true });

    console.log(`\nOutput directory: ${outputDir}\n`);

    let page = 1;
    const limit = 50; // Process 50 netlinks per page
    let totalScraped = 0;
    let totalSuccessful = 0;
    let totalFailed = 0;

    while (true) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`PROCESSING PAGE ${page}`);
      console.log('='.repeat(60));

      // Fetch netlinks for this page
      const apiResponse = await fetchNetlinksFromAPI(dashboardClient, page, limit);

      if (!apiResponse.data || apiResponse.data.length === 0) {
        console.log('\n✓ No more netlinks to scrape');
        break;
      }

      const netlinks = apiResponse.data;
      console.log(`\nScraping ${netlinks.length} netlinks from page ${page}...`);

      // Scrape the netlinks
      const results = await scraperService.scrapeNetlinks(netlinks, {
        concurrency: 2,
        timeout: 120000,
        retries: 2,
        delay: 500,
        skipErrors: true,
        enableDomDetailer: false,
        onProgress: (current, total, url) => {
          const percentage = ((current / total) * 100).toFixed(1);
          process.stdout.write(
            `\r   Progress: ${percentage}% (${current}/${total})`
          );
        },
      });

      console.log('\n');

      // Save results to file
      const filename = `page-${page}-results.json`;
      const filepath = path.join(outputDir, filename);
      await fs.writeFile(filepath, JSON.stringify(results, null, 2));

      const successCount = results.filter(r => r.success).length;
      const failedCount = results.filter(r => !r.success).length;

      console.log(`   Saved ${filename}: ${successCount}/${results.length} successful`);

      // Post batch results to API
      try {
        await scraperService.postBatchResults(results);
        console.log(`   ✓ Posted page ${page} results to API`);
      } catch (error) {
        console.error(`   ✗ Failed to post page ${page}: ${error.message}`);
      }

      // Update totals
      totalScraped += results.length;
      totalSuccessful += successCount;
      totalFailed += failedCount;

      // Check if we should continue to next page
      if (apiResponse.meta && page >= apiResponse.meta.totalPages) {
        console.log(`\n✓ Processed all ${apiResponse.meta.totalPages} pages`);
        break;
      }

      page++;

      // Add delay between pages to avoid overwhelming the API
      console.log('\n   Waiting before next page...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log('\n' + '='.repeat(60));
    console.log('BATCH SCRAPING COMPLETE');
    console.log('='.repeat(60));
    console.log(`\nTotal Statistics:`);
    console.log(`  Pages processed: ${page}`);
    console.log(`  Total scraped: ${totalScraped}`);
    console.log(`  Successful: ${totalSuccessful}`);
    console.log(`  Failed: ${totalFailed}`);
    console.log(`  Success rate: ${((totalSuccessful / totalScraped) * 100).toFixed(1)}%`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('Batch scraping failed:', error.message);
    console.error(error.stack);
    await app.close();
    process.exit(1);
  }

  await app.close();
  console.log('\n✓ Application closed. Exiting...');
  process.exit(0);
}

/**
 * Scrape and save results to single file
 */
async function scrapeAndSaveToFile() {
  // Global handler for unhandled promise rejections from playwright-extra stealth plugin
  process.on('unhandledRejection', (reason: any) => {
    const message = reason?.message || String(reason);
    if (message?.includes('cdpSession') || message?.includes('Target page, context or browser has been closed') || message?.includes('Session closed')) {
      return; // Suppress CDP cleanup errors
    }
    throw reason;
  });

  console.log('\n' + '='.repeat(60));
  console.log('SCRAPE FROM REST API AND SAVE TO FILE');
  console.log('='.repeat(60));

  const app = await NestFactory.createApplicationContext(AppModule);
  const scraperService = app.get(NetlinkScraperService);
  const dashboardClient = app.get(DashboardHttpClient);

  try {
    // Allow custom page and limit from command line
    const page = parseInt(process.argv[3]) || 1;
    const limit = parseInt(process.argv[4]) || 100;

    const apiResponse = await fetchNetlinksFromAPI(dashboardClient, page, limit);

    if (!apiResponse.data || apiResponse.data.length === 0) {
      console.log('\n⚠ No netlinks to scrape');
      return;
    }

    const netlinks = apiResponse.data;
    console.log(`\nScraping ${netlinks.length} netlinks...\n`);

    const results = await scraperService.scrapeNetlinks(netlinks, {
      concurrency: 3,
      timeout: 120000,
      retries: 2,
      delay: 500,
      skipErrors: true,
      enableDomDetailer: false,
      onProgress: (current, total, url) => {
        const percentage = ((current / total) * 100).toFixed(1);
        process.stdout.write(
          `\r   Progress: ${percentage}% (${current}/${total}) - ${url.slice(0, 50)}...`
        );
      },
    });

    console.log('\n\n✓ Scraping completed!');
    console.log('\nSaving results...');

    // Save results to file
    const outputDir = path.join(process.cwd(), 'scraped-data');
    await fs.mkdir(outputDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const filename = `netlinks-rest-${timestamp}-page${page}.json`;
    const filepath = path.join(outputDir, filename);

    await fs.writeFile(filepath, JSON.stringify(results, null, 2));

    console.log(`✓ Saved to: ${filepath}`);

    const successCount = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success).length;

    console.log('\nStats:');
    console.log(`  Total: ${results.length}`);
    console.log(`  Successful: ${successCount}`);
    console.log(`  Failed: ${failedCount}`);
    console.log(`  Success rate: ${((successCount / results.length) * 100).toFixed(1)}%`);

    // Post to API
    console.log('\nPosting results to API...');
    try {
      await scraperService.postBatchResults(results);
      console.log('✓ Results posted successfully');
    } catch (error) {
      console.error('✗ Failed to post results:', error.message);
    }

  } catch (error) {
    console.error('Scraping failed:', error.message);
    console.error(error.stack);
    await app.close();
    process.exit(1);
  }

  await app.close();
  console.log('\n✓ Application closed. Exiting...');
  process.exit(0);
}

/**
 * Show usage instructions
 */
function showUsage() {
  console.log('\n' + '='.repeat(60));
  console.log('NETLINK SCRAPER REST - USAGE');
  console.log('='.repeat(60));
  console.log(`
Usage:
  npm run test:netlink-scraper-rest              - Scrape first 100 netlinks
  npm run test:netlink-scraper-rest batch        - Scrape all pages
  npm run test:netlink-scraper-rest save         - Scrape and save to file
  npm run test:netlink-scraper-rest save 2 50    - Scrape page 2 with limit 50

Commands:
  (default) - Fetch netlinks from API and scrape them
  batch     - Scrape all pages with pagination
  save      - Scrape and save results to file
  help      - Show this help message

Examples:
  # Scrape first 100 netlinks from API
  npm run test:netlink-scraper-rest

  # Scrape all pages (50 netlinks per page)
  npm run test:netlink-scraper-rest batch

  # Scrape page 2 with 50 netlinks and save
  npm run test:netlink-scraper-rest save 2 50

Features:
  - Fetches netlinks from /netlink/all/toScrape API endpoint
  - Supports pagination (page and limit parameters)
  - Progress tracking during scraping
  - Automatic retry on failures
  - Posts results back to API
  - Saves results to files (in batch/save modes)

Environment Variables Required:
  DASHBOARD_BASE_URL - Base URL for the Dashboard API
  `);
  console.log('='.repeat(60) + '\n');
}

// Run based on command
if (require.main === module) {
  const command = process.argv[2];

  switch (command) {
    case 'batch':
      batchScrapeAllPages().catch(console.error);
      break;
    case 'save':
      scrapeAndSaveToFile().catch(console.error);
      break;
    case 'help':
    case '--help':
    case '-h':
      showUsage();
      break;
    default:
      testNetlinkScraperWithREST().catch(console.error);
  }
}

export { testNetlinkScraperWithREST, batchScrapeAllPages, scrapeAndSaveToFile };
