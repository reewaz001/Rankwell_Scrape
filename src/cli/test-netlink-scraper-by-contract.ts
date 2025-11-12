import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { NetlinkScraperService } from '../modules/paperclub/services/netlink-scraper.service';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Test script for scraping netlinks by contract_id with detailed logging
 *
 * This script demonstrates:
 * 1. Filtering netlinks by contract_id
 * 2. Scraping with detailed logging to file
 * 3. Progress tracking
 * 4. Saving results to JSON file
 * 5. Posting results to API
 *
 * Usage:
 *   npm run test:netlink-scraper:contract <contract_id>
 *
 * Example:
 *   npm run test:netlink-scraper:contract 123
 */
async function testNetlinkScraperByContract() {
  console.log('='.repeat(60));
  console.log('TESTING NETLINK SCRAPER BY CONTRACT ID');
  console.log('='.repeat(60));

  // Get contract_id from command line arguments
  const contractId = process.argv[2];

  if (!contractId) {
    console.error('\n❌ Error: contract_id is required');
    console.log('\nUsage:');
    console.log('  npm run test:netlink-scraper:contract <contract_id>');
    console.log('\nExample:');
    console.log('  npm run test:netlink-scraper:contract 123');
    process.exit(1);
  }

  console.log(`\nContract ID: ${contractId}\n`);

  const app = await NestFactory.createApplicationContext(AppModule);
  const scraperService = app.get(NetlinkScraperService);

  try {
    // Create output directory
    const outputDir = path.join(process.cwd(), 'scraped-data');
    await fs.mkdir(outputDir, { recursive: true });

    // Prepare log file path
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const logFilePath = path.join(process.cwd(), 'logs', `contract-${contractId}-${timestamp}.log`);

    // Store all results for JSON file
    const allResults: any[] = [];

    console.log('Starting scraping with detailed logging...\n');
    console.log(`Log file: ${logFilePath}\n`);

    // Scrape by contract_id with logging enabled
    const stats = await scraperService.scrapeByContractId(contractId, {
      concurrency: 3,
      timeout: 30000,
      retries: 2,
      delay: 500,
      enableLogging: true,
      logFilePath: logFilePath,
      onProgress: (current, total, url) => {
        const percentage = ((current / total) * 100).toFixed(1);
        const shortUrl = url.length > 60 ? url.substring(0, 60) + '...' : url;
        process.stdout.write(
          `\r   Progress: ${percentage}% (${current}/${total}) - ${shortUrl}`
        );
      },
      onSuccess: (data) => {
        allResults.push(data);
      },
    });

    console.log('\n\nScraping completed!\n');

    // Save results to JSON file
    const jsonFilename = `contract-${contractId}-results-${timestamp}.json`;
    const jsonFilepath = path.join(outputDir, jsonFilename);
    await fs.writeFile(jsonFilepath, JSON.stringify(allResults, null, 2));

    console.log('='.repeat(60));
    console.log('RESULTS SUMMARY');
    console.log('='.repeat(60));
    console.log(`Contract ID: ${contractId}`);
    console.log(`Total netlinks: ${stats.total}`);
    console.log(`Successful: ${stats.successful}`);
    console.log(`Failed: ${stats.failed}`);
    console.log(`Duration: ${(stats.duration / 1000).toFixed(2)}s`);
    console.log(`Success rate: ${stats.total > 0 ? ((stats.successful / stats.total) * 100).toFixed(1) : 0}%`);
    console.log('='.repeat(60));

    // Display files saved
    console.log('\nFiles saved:');
    console.log(`  📋 Log file: ${logFilePath}`);
    console.log(`  📄 Results JSON: ${jsonFilepath}`);

    // Display error summary if any
    if (stats.errors.length > 0) {
      console.log('\n⚠ Errors encountered:');
      stats.errors.slice(0, 5).forEach((error, index) => {
        console.log(`  ${index + 1}. ${error.url}`);
        console.log(`     Error: ${error.error}`);
      });
      if (stats.errors.length > 5) {
        console.log(`  ... and ${stats.errors.length - 5} more (see log file for details)`);
      }
    }

    // Post results to batch upsert endpoint
    if (allResults.length > 0) {
      console.log('\n📤 Posting results to API...');
      try {
        await scraperService.postBatchResults(allResults);
        console.log('✓ Batch upsert completed successfully');
      } catch (error) {
        console.error('✗ Batch upsert failed:', error.message);
        console.error('  Results have been saved to file. You can retry later.');
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('NEXT STEPS');
    console.log('='.repeat(60));
    console.log('\n1. Review the log file for detailed information about each netlink');
    console.log('2. Check the JSON file for structured results');
    console.log('3. If errors occurred, investigate the failed URLs');
    console.log('\nCommands:');
    console.log('  npm run test:netlink-scraper:contract <contract_id> - Run for a specific contract');

  } catch (error) {
    console.error('\n✗ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await app.close();
  }
}

/**
 * Show usage information
 */
function showUsage() {
  console.log('\n' + '='.repeat(60));
  console.log('SCRAPE BY CONTRACT ID - USAGE');
  console.log('='.repeat(60));

  const usage = `
This script scrapes netlinks filtered by contract_id with detailed logging.

USAGE:
  npm run test:netlink-scraper:contract <contract_id>

EXAMPLES:
  npm run test:netlink-scraper:contract 123
  npm run test:netlink-scraper:contract 456

FEATURES:
  ✓ Filters netlinks by contract_id
  ✓ Detailed logging to file for every netlink
  ✓ Progress tracking during scraping
  ✓ Saves results to JSON file
  ✓ Posts results to API
  ✓ Error summary and reporting

OUTPUT FILES:
  logs/contract-<id>-<timestamp>.log       - Detailed log file
  scraped-data/contract-<id>-results.json  - Results in JSON format

LOG FILE CONTENTS:
  For each netlink, the log contains:
  - Netlink ID
  - Contract ID
  - URL and Landing Page
  - Scraping status (success/failed)
  - Number of links found
  - Match status and type
  - Link type (dofollow/nofollow)
  - Link details (href, text, rel)
  - Timestamp
  - Error messages (if any)
`;

  console.log(usage);
}

// Run based on command
if (require.main === module) {
  const command = process.argv[2];

  if (command === 'help' || command === '--help' || command === '-h') {
    showUsage();
  } else {
    testNetlinkScraperByContract().catch(console.error);
  }
}

export { testNetlinkScraperByContract };
