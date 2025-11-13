/**
 * Test DomDetailer Integration with Netlink Scraper
 *
 * This script tests the integration of DomDetailer with the netlink scraper.
 * It will:
 * 1. Scrape a few netlinks
 * 2. Check each URL with DomDetailer
 * 3. Include DomDetailer data in the batch upsert
 *
 * Usage:
 *   ts-node src/cli/test-domdetailer-integration.ts
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { NetlinkScraperService } from '../modules/paperclub/services/netlink-scraper.service';
import { NetlinkService } from '../modules/paperclub/services/netlink.service';
import * as fs from 'fs/promises';
import * as path from 'path';

async function bootstrap() {
  console.log('='.repeat(80));
  console.log('TESTING DOMDETAILER INTEGRATION WITH NETLINK SCRAPER');
  console.log('='.repeat(80));

  // Create NestJS application
  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    // Get services
    const scraperService = app.get(NetlinkScraperService);
    const netlinkService = app.get(NetlinkService);

    console.log('\n[1/5] Fetching sample netlinks...');

    // Fetch a few netlinks to test
    const firstPage = await netlinkService.fetchPage(1, 5);
    const sampleNetlinks = firstPage.data.slice(0, 3); // Take only 3 for testing

    console.log(`✓ Fetched ${sampleNetlinks.length} netlinks for testing`);
    console.log('\nNetlinks to scrape:');
    sampleNetlinks.forEach((netlink, index) => {
      console.log(`  ${index + 1}. ${netlink.url_bought || netlink.url} (ID: ${netlink.id})`);
      if (netlink.landing_page) {
        console.log(`     Landing page: ${netlink.landing_page}`);
      }
    });

    console.log('\n[2/5] Scraping netlinks WITH DomDetailer integration...');
    console.log('Note: This will take longer as it checks DomDetailer for each URL');

    const startTime = Date.now();

    // Scrape with DomDetailer enabled
    const results = await scraperService.scrapeNetlinks(sampleNetlinks, {
      concurrency: 1, // Use 1 to see results sequentially
      timeout: 30000,
      retries: 2,
      enableDomDetailer: true, // ENABLE DOMDETAILER
      domDetailerConcurrency: 2,
      enableLogging: true, // Enable logging to see details
      onProgress: (current, total, url) => {
        console.log(`\n  Progress: ${current}/${total} - Scraping ${url}...`);
      },
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n[3/5] Scraping complete!');
    console.log(`Duration: ${duration}s`);

    // Display results
    console.log('\n[4/5] Results Summary:');
    console.log('-'.repeat(80));

    results.forEach((result, index) => {
      console.log(`\n${index + 1}. ${result.url}`);
      console.log(`   Netlink ID: ${result.netlinkId || 'N/A'}`);
      console.log(`   Scrape Status: ${result.success ? '✓ Success' : '✗ Failed'}`);

      if (result.success) {
        console.log(`   Link Found: ${result.foundLink?.matched ? '✓ Yes' : '✗ No'}`);
        if (result.foundLink?.matched) {
          console.log(`   Link Type: ${result.foundLink.link_type || 'unknown'}`);
          console.log(`   Match Type: ${result.foundLink.matchType || 'N/A'}`);
        } else if (result.domainFound) {
          console.log(`   Domain Match: ✓ Yes (but not exact URL)`);
          console.log(`   Link Type: ${result.domainFoundLink?.link_type || 'unknown'}`);
        }
      } else {
        console.log(`   Error: ${result.error}`);
      }

      // Display DomDetailer results
      if (result.domDetailer) {
        console.log(`   DomDetailer Check: ${result.domDetailer.success ? '✓ Success' : '✗ Failed'}`);
        if (result.domDetailer.success && result.domDetailer.data) {
          console.log(`   DomDetailer Data: Available`);
          // Display a few key fields from DomDetailer data
          const data = result.domDetailer.data;
          if (data.domain) console.log(`     - Domain: ${data.domain}`);
          if (data.status) console.log(`     - Status: ${data.status}`);
          // Add more fields as needed based on actual DomDetailer response
        } else if (result.domDetailer.error) {
          console.log(`   DomDetailer Error: ${result.domDetailer.error}`);
        }
      } else {
        console.log(`   DomDetailer Check: Not performed`);
      }
    });

    console.log('\n' + '-'.repeat(80));

    // Test batch upsert with DomDetailer data
    console.log('\n[5/5] Testing batch upsert with DomDetailer data...');

    try {
      await scraperService.postBatchResults(results);
      console.log('✓ Batch upsert successful!');
      console.log('  DomDetailer data has been included in the upsert payload.');
    } catch (error) {
      console.error('✗ Batch upsert failed:', error.message);
      if (error.response) {
        console.error('  Response:', JSON.stringify(error.response.data, null, 2));
      }
    }

    // Save detailed results to file
    const outputDir = path.join(process.cwd(), 'logs');
    await fs.mkdir(outputDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputFile = path.join(outputDir, `domdetailer-test-${timestamp}.json`);

    await fs.writeFile(outputFile, JSON.stringify(results, null, 2));
    console.log(`\n✓ Detailed results saved to: ${outputFile}`);

    console.log('\n' + '='.repeat(80));
    console.log('TEST COMPLETE');
    console.log('='.repeat(80));

    console.log('\nSummary:');
    console.log(`  Total URLs tested: ${results.length}`);
    console.log(`  Successful scrapes: ${results.filter(r => r.success).length}`);
    console.log(`  Failed scrapes: ${results.filter(r => !r.success).length}`);
    console.log(`  DomDetailer checks successful: ${results.filter(r => r.domDetailer?.success).length}`);
    console.log(`  DomDetailer checks failed: ${results.filter(r => r.domDetailer && !r.domDetailer.success).length}`);

    console.log('\nNext Steps:');
    console.log('  1. Check the log file for detailed scraping information');
    console.log('  2. Verify the batch upsert in the dashboard');
    console.log('  3. Check that domdetailer_data is included in the database');

  } catch (error) {
    console.error('\n✗ Test failed:', error);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await app.close();
  }
}

// Run the test
bootstrap().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
