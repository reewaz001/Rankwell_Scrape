import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { DomDetailerService, DomDetailerResult } from '../common/domdetailer.service';
import { NetlinkService, NetlinkItem } from '../modules/paperclub/services/netlink.service';
import { DashboardHttpClient } from '../common/dashboard-http-client.service';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * DomDetailer Results with Netlink Info
 */
interface DomDetailerNetlinkResult extends DomDetailerResult {
  netlinkId?: number;
  urlBought?: string;
}

/**
 * Format for posting to additional info endpoint
 */
interface DomDetailerAdditionalInfo {
  netlink_id: number;
  domdetailers: {
    url: string;
    success: boolean;
    checkedAt: string;
    data?: any;
    error?: string;
  };
}

/**
 * Post DomDetailer results to the database
 */
async function postDomDetailerResults(
  dashboardClient: DashboardHttpClient,
  results: DomDetailerNetlinkResult[]
): Promise<void> {
  const items = results
    .filter(r => r.netlinkId !== undefined)
    .map(r => ({
      netlink_id: r.netlinkId!,
      domdetailers: JSON.stringify({
        url: r.url,
        success: r.success,
        checkedAt: r.checkedAt,
        ...(r.success && r.data ? { data: r.data } : {}),
        ...(r.error ? { error: r.error } : {}),
      }),
    }));

  if (items.length === 0) {
    console.log('   No results to save to database');
    return;
  }

  console.log(`\n3. Saving ${items.length} results to database...`);
  console.log('   Request body sample:', JSON.stringify(items[0], null, 2));

  try {
    const response = await dashboardClient.post('/netlink/additionalInfo/upsert', { items });
    console.log('   Response:', JSON.stringify(response));
    console.log('   Results saved to database');
  } catch (error) {
    console.error('   Error saving to database:', error.message);
    if (error.response) {
      console.error('   Response data:', JSON.stringify(error.response.data));
    }
    throw error;
  }
}

/**
 * Run DomDetailer checks on ALL netlinks with pagination
 *
 * This script:
 * 1. Fetches netlinks page by page from the API
 * 2. Runs DomDetailer checks on url_bought URLs
 * 3. Saves results to database after each batch
 * 4. Continues until all pages are processed
 */
async function testDomDetailer() {
  console.log('='.repeat(60));
  console.log('DOMDETAILER - PROCESSING ALL NETLINKS');
  console.log('='.repeat(60));

  const app = await NestFactory.createApplicationContext(AppModule);
  const domDetailerService = app.get(DomDetailerService);
  const netlinkService = app.get(NetlinkService);
  const dashboardClient = app.get(DashboardHttpClient);

  const BATCH_SIZE = 50; // Items per page
  const CONCURRENCY = 3; // Concurrent DomDetailer requests
  const DELAY = 500; // Delay between requests

  let currentPage = 1;
  let totalPages = 1;
  let totalProcessed = 0;
  let totalSuccess = 0;
  let totalFailed = 0;
  const startTime = Date.now();

  try {
    // Fetch first page to get total count
    console.log('\n1. Fetching netlinks...');
    const firstPage = await netlinkService.fetchPage(1, BATCH_SIZE);
    totalPages = firstPage.pagination.totalPages;
    const totalItems = firstPage.pagination.totalItems;

    console.log(`   Total netlinks: ${totalItems}`);
    console.log(`   Total pages: ${totalPages}`);
    console.log(`   Batch size: ${BATCH_SIZE}`);
    console.log(`   Concurrency: ${CONCURRENCY}\n`);

    // Process all pages
    let hasNextPage = true;
    let pageData = firstPage;

    while (hasNextPage) {
      console.log('='.repeat(60));
      console.log(`PROCESSING PAGE ${currentPage}/${totalPages}`);
      console.log('='.repeat(60));

      // Fetch current page (skip if first page already fetched)
      if (currentPage > 1) {
        pageData = await netlinkService.fetchPage(currentPage, BATCH_SIZE);
      }

      // Extract url_bought URLs
      const urlsBought = pageData.data
        .filter((n: NetlinkItem) => n.url_bought)
        .map((n: NetlinkItem) => ({
          netlinkId: n.id,
          urlBought: n.url_bought,
        }));

      console.log(`\n   Found ${urlsBought.length} netlinks with url_bought`);

      if (urlsBought.length === 0) {
        console.log('   Skipping - no url_bought in this page\n');
        hasNextPage = pageData.pagination.hasNextPage;
        currentPage++;
        continue;
      }

      // Run DomDetailer checks
      console.log(`\n2. Running DomDetailer checks...\n`);

      const urls = urlsBought.map(u => u.urlBought);
      const results = await domDetailerService.checkDomainsBatchConcurrent(urls, CONCURRENCY, DELAY);

      // Enrich results with netlink info
      const enrichedResults: DomDetailerNetlinkResult[] = results.map((result, index) => ({
        ...result,
        netlinkId: urlsBought[index].netlinkId,
        urlBought: urlsBought[index].urlBought,
      }));

      const pageSuccess = enrichedResults.filter(r => r.success).length;
      const pageFailed = enrichedResults.length - pageSuccess;

      console.log(`   Page ${currentPage} results: ${pageSuccess} success, ${pageFailed} failed`);

      // Save to database
      await postDomDetailerResults(dashboardClient, enrichedResults);

      // Update totals
      totalProcessed += enrichedResults.length;
      totalSuccess += pageSuccess;
      totalFailed += pageFailed;

      // Progress
      const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
      console.log(`\n   Progress: ${totalProcessed}/${totalItems} (${((totalProcessed / totalItems) * 100).toFixed(1)}%)`);
      console.log(`   Elapsed: ${elapsed} minutes\n`);

      // Check for next page
      hasNextPage = pageData.pagination.hasNextPage;
      currentPage++;
    }

    // Final Summary
    const duration = (Date.now() - startTime) / 1000;
    console.log('\n' + '='.repeat(60));
    console.log('FINAL SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total processed: ${totalProcessed}`);
    console.log(`Successful: ${totalSuccess}`);
    console.log(`Failed: ${totalFailed}`);
    console.log(`Success rate: ${((totalSuccess / totalProcessed) * 100).toFixed(1)}%`);
    console.log(`Duration: ${(duration / 60).toFixed(2)} minutes`);
    console.log(`Rate: ${(totalProcessed / duration).toFixed(2)} checks/second`);

  } catch (error) {
    console.error('\nProcessing failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await app.close();
  }
}

/**
 * Batch check all netlinks with DomDetailer
 */
async function batchDomDetailerCheck() {
  console.log('\n' + '='.repeat(60));
  console.log('BATCH DOMDETAILER CHECK');
  console.log('='.repeat(60));

  const app = await NestFactory.createApplicationContext(AppModule);
  const domDetailerService = app.get(DomDetailerService);
  const netlinkService = app.get(NetlinkService);
  const dashboardClient = app.get(DashboardHttpClient);

  try {
    // Fetch all netlinks
    console.log('\n1. Fetching all netlinks...');
    const netlinks = await netlinkService.fetchAllNetlinks({
      limit: 100,
      onProgress: (page, totalPages, totalItems) => {
        console.log(`   Page ${page}/${totalPages} (${totalItems} items total)`);
      },
    });

    console.log(`\n   Total netlinks fetched: ${netlinks.length}`);

    // Extract unique url_bought - map url_bought to netlinkId
    const urlBoughtMap = new Map<string, number>();

    for (const netlink of netlinks) {
      if (netlink.url_bought && !urlBoughtMap.has(netlink.url_bought)) {
        urlBoughtMap.set(netlink.url_bought, netlink.id);
      }
    }

    const uniqueUrlsBought = Array.from(urlBoughtMap.keys());
    console.log(`   Unique url_bought: ${uniqueUrlsBought.length}`);

    // Run DomDetailer checks with concurrency
    console.log('\n2. Running DomDetailer checks on url_bought (concurrency: 3)...\n');

    const startTime = Date.now();

    const results = await domDetailerService.checkDomainsBatchConcurrent(
      uniqueUrlsBought,
      3, // concurrency
      500 // delay between requests
    );

    // Enrich results with netlink info
    const enrichedResults: DomDetailerNetlinkResult[] = results.map(result => {
      const netlinkId = urlBoughtMap.get(result.url);
      return {
        ...result,
        netlinkId: netlinkId,
        urlBought: result.url,
      };
    });

    const duration = (Date.now() - startTime) / 1000;
    const successCount = enrichedResults.filter(r => r.success).length;

    console.log('\n' + '='.repeat(60));
    console.log('BATCH CHECK RESULTS');
    console.log('='.repeat(60));
    console.log(`Total checked: ${enrichedResults.length}`);
    console.log(`Successful: ${successCount}`);
    console.log(`Failed: ${enrichedResults.length - successCount}`);
    console.log(`Success rate: ${((successCount / enrichedResults.length) * 100).toFixed(1)}%`);
    console.log(`Duration: ${duration.toFixed(2)}s`);
    console.log(`Rate: ${(enrichedResults.length / duration).toFixed(2)} checks/second`);

    // Save results to database
    await postDomDetailerResults(dashboardClient, enrichedResults);

    // Also save results to file
    const outputDir = path.join(process.cwd(), 'domdetailer-results');
    await fs.mkdir(outputDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const filename = `domdetailer-results-${timestamp}.json`;
    const filepath = path.join(outputDir, filename);

    await fs.writeFile(filepath, JSON.stringify(enrichedResults, null, 2));
    console.log(`\nResults also saved to: ${filepath}`);

  } catch (error) {
    console.error('\nBatch check failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await app.close();
  }
}

/**
 * Check DomDetailer for a specific contract
 */
async function checkByContract(contractId: number | string) {
  console.log('\n' + '='.repeat(60));
  console.log(`DOMDETAILER CHECK FOR CONTRACT: ${contractId}`);
  console.log('='.repeat(60));

  const app = await NestFactory.createApplicationContext(AppModule);
  const domDetailerService = app.get(DomDetailerService);
  const netlinkService = app.get(NetlinkService);
  const dashboardClient = app.get(DashboardHttpClient);

  try {
    // Fetch netlinks for contract
    console.log('\n1. Fetching netlinks for contract...');
    const netlinks = await netlinkService.fetchAllNetlinks({
      limit: 100,
      contractId: contractId,
      onProgress: (page, totalPages, totalItems) => {
        console.log(`   Page ${page}/${totalPages} (${totalItems} items)`);
      },
    });

    console.log(`\n   Netlinks found: ${netlinks.length}`);

    if (netlinks.length === 0) {
      console.log('No netlinks found for this contract');
      await app.close();
      return;
    }

    // Extract url_bought - map url_bought to netlinkId
    const urlBoughtMap = new Map<string, number>();

    for (const netlink of netlinks) {
      if (netlink.url_bought && !urlBoughtMap.has(netlink.url_bought)) {
        urlBoughtMap.set(netlink.url_bought, netlink.id);
      }
    }

    const uniqueUrlsBought = Array.from(urlBoughtMap.keys());
    console.log(`   Unique url_bought: ${uniqueUrlsBought.length}`);

    // Run DomDetailer checks
    console.log('\n2. Running DomDetailer checks on url_bought...\n');

    const startTime = Date.now();
    const results = await domDetailerService.checkDomainsBatchConcurrent(
      uniqueUrlsBought,
      3,
      500
    );

    // Enrich results with netlink info
    const enrichedResults: DomDetailerNetlinkResult[] = results.map(result => {
      const netlinkId = urlBoughtMap.get(result.url);
      return {
        ...result,
        netlinkId: netlinkId,
        urlBought: result.url,
      };
    });

    const duration = (Date.now() - startTime) / 1000;
    const successCount = enrichedResults.filter(r => r.success).length;

    console.log('\n' + '='.repeat(60));
    console.log('RESULTS');
    console.log('='.repeat(60));
    console.log(`Contract ID: ${contractId}`);
    console.log(`Total checked: ${enrichedResults.length}`);
    console.log(`Successful: ${successCount}`);
    console.log(`Failed: ${enrichedResults.length - successCount}`);
    console.log(`Duration: ${duration.toFixed(2)}s`);

    // Save to database
    await postDomDetailerResults(dashboardClient, enrichedResults);

    // Show results
    console.log('\nResults:');
    for (const result of enrichedResults) {
      if (result.success) {
        console.log(`  ${result.url}`);
        console.log(`    DA: ${result.data?.domainAuthority || 'N/A'}, PA: ${result.data?.pageAuthority || 'N/A'}`);
      } else {
        console.log(`  ${result.url}: ${result.error}`);
      }
    }

  } catch (error) {
    console.error('\nCheck failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await app.close();
  }
}

/**
 * Check a single URL with DomDetailer
 */
async function checkSingleUrl(url: string) {
  console.log('\n' + '='.repeat(60));
  console.log('DOMDETAILER SINGLE URL CHECK');
  console.log('='.repeat(60));

  const app = await NestFactory.createApplicationContext(AppModule);
  const domDetailerService = app.get(DomDetailerService);

  try {
    console.log(`\nChecking: ${url}\n`);

    const result = await domDetailerService.checkDomain(url);

    if (result.success) {
      console.log('✓ Check successful!\n');
      console.log('Result:');
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log('✗ Check failed!');
      console.log(`Error: ${result.error}`);
    }

  } catch (error) {
    console.error('\n✗ Check failed:', error.message);
    process.exit(1);
  } finally {
    await app.close();
  }
}

/**
 * Show help
 */
function showHelp() {
  console.log(`
DomDetailer CLI Tool
====================

Usage: npm run test:domdetailer [command] [options]

Commands:
  (none)              Run test on sample netlinks (5 items)
  batch               Check all netlinks with DomDetailer
  contract <id>       Check netlinks for a specific contract
  url <url>           Check a single URL
  help                Show this help message

Examples:
  npm run test:domdetailer                    # Test on sample
  npm run test:domdetailer batch              # Batch check all
  npm run test:domdetailer contract 123       # Check contract 123
  npm run test:domdetailer url example.com    # Check single URL
`);
}

// Run based on command
if (require.main === module) {
  const command = process.argv[2];
  const arg = process.argv[3];

  switch (command) {
    case 'batch':
      batchDomDetailerCheck().catch(console.error);
      break;
    case 'contract':
      if (!arg) {
        console.error('Error: Contract ID required');
        console.log('Usage: npm run test:domdetailer contract <id>');
        process.exit(1);
      }
      checkByContract(arg).catch(console.error);
      break;
    case 'url':
      if (!arg) {
        console.error('Error: URL required');
        console.log('Usage: npm run test:domdetailer url <url>');
        process.exit(1);
      }
      checkSingleUrl(arg).catch(console.error);
      break;
    case 'help':
    case '--help':
    case '-h':
      showHelp();
      break;
    default:
      testDomDetailer().catch(console.error);
  }
}

export { testDomDetailer, batchDomDetailerCheck, checkByContract, checkSingleUrl };
