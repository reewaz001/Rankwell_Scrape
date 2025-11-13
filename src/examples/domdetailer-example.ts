/**
 * DomDetailer Service - TypeScript Examples
 *
 * This file demonstrates various ways to use the DomDetailer service.
 *
 * Usage:
 *   ts-node src/examples/domdetailer-example.ts
 */

import { DomDetailerService } from '../common/domdetailer.service';

async function example1_BasicUsage() {
  console.log('='.repeat(80));
  console.log('Example 1: Basic Usage');
  console.log('='.repeat(80));

  const domDetailer = new DomDetailerService();

  try {
    const domain = 'example.com';
    console.log(`\nChecking domain: ${domain}`);

    const result = await domDetailer.checkDomain(domain);

    console.log('\nResult:');
    console.log(`  Success: ${result.success}`);
    console.log(`  Checked at: ${result.checkedAt}`);

    if (result.success && result.data) {
      console.log('\nDomain Data:');
      console.log(JSON.stringify(result.data, null, 2));
    } else if (result.error) {
      console.log(`  Error: ${result.error}`);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

async function example2_CustomConfiguration() {
  console.log('\n' + '='.repeat(80));
  console.log('Example 2: Custom Configuration');
  console.log('='.repeat(80));

  // Create service and configure it
  const domDetailer = new DomDetailerService();

  // Configure with custom settings (optional)
  domDetailer.configure({
    app: 'my_custom_app',
    apiKey: '5MJUXJ1XZVIP9',
    timeout: 20000,
  });

  try {
    const domain = 'google.com';
    console.log(`\nChecking domain: ${domain}`);

    const result = await domDetailer.checkDomain(domain);

    console.log('\nResult:');
    console.log(`  Success: ${result.success}`);

    if (result.success && result.data) {
      console.log('  Data available');
      // Display some key fields if they exist
      const data = result.data as any;
      if (data.domain) console.log(`  - Domain: ${data.domain}`);
      if (data.status) console.log(`  - Status: ${data.status}`);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

async function example3_BatchProcessing() {
  console.log('\n' + '='.repeat(80));
  console.log('Example 3: Batch Processing (Sequential)');
  console.log('='.repeat(80));

  const domDetailer = new DomDetailerService();

  const domains = [
    'example.com',
    'google.com',
    'github.com',
  ];

  console.log(`\nChecking ${domains.length} domains sequentially...`);
  const startTime = Date.now();

  const results = await domDetailer.checkDomainsBatch(domains, 500);

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\nCompleted in ${duration} seconds`);

  console.log('\nResults:');
  results.forEach((result, index) => {
    console.log(`\n${index + 1}. ${result.url}`);
    console.log(`   Success: ${result.success ? '✓' : '✗'}`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  });

  const successful = results.filter(r => r.success).length;
  console.log(`\nSummary: ${successful}/${results.length} successful`);
}

async function example4_ConcurrentProcessing() {
  console.log('\n' + '='.repeat(80));
  console.log('Example 4: Concurrent Batch Processing');
  console.log('='.repeat(80));

  const domDetailer = new DomDetailerService();

  const domains = [
    'example.com',
    'google.com',
    'github.com',
    'stackoverflow.com',
    'reddit.com',
  ];

  console.log(`\nChecking ${domains.length} domains concurrently (concurrency: 3)...`);
  const startTime = Date.now();

  const results = await domDetailer.checkDomainsBatchConcurrent(domains, 3, 500);

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\nCompleted in ${duration} seconds`);

  console.log('\nResults:');
  results.forEach((result, index) => {
    console.log(`\n${index + 1}. ${result.url}`);
    console.log(`   Success: ${result.success ? '✓' : '✗'}`);
    if (result.success && result.data) {
      console.log(`   Data: Available`);
    } else if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  });

  const successful = results.filter(r => r.success).length;
  console.log(`\nSummary: ${successful}/${results.length} successful`);
}

async function example5_ResultMap() {
  console.log('\n' + '='.repeat(80));
  console.log('Example 5: Using Result Map for Easy Lookup');
  console.log('='.repeat(80));

  const domDetailer = new DomDetailerService();

  const domains = ['example.com', 'google.com', 'github.com'];

  console.log(`\nChecking ${domains.length} domains...`);
  const results = await domDetailer.checkDomainsBatch(domains);

  // Get result map for easy lookup
  const resultMap = domDetailer.getResultMap(results);

  console.log('\nLooking up specific domains:');
  console.log('\nDomain: example.com');
  const exampleResult = resultMap.get('example.com');
  if (exampleResult) {
    console.log(`  Success: ${exampleResult.success}`);
    if (exampleResult.data) {
      console.log(`  Has data: Yes`);
    }
  }

  console.log('\nDomain: google.com');
  const googleResult = resultMap.get('google.com');
  if (googleResult) {
    console.log(`  Success: ${googleResult.success}`);
    if (googleResult.data) {
      console.log(`  Has data: Yes`);
    }
  }
}

async function example6_ErrorHandling() {
  console.log('\n' + '='.repeat(80));
  console.log('Example 6: Error Handling');
  console.log('='.repeat(80));

  const domDetailer = new DomDetailerService();

  const domains = [
    'example.com',
    'invalid-domain-that-does-not-exist-12345.com',
    'google.com',
  ];

  console.log(`\nChecking ${domains.length} domains (including an invalid one)...`);

  const results = await domDetailer.checkDomainsBatch(domains);

  console.log('\nResults:');
  results.forEach((result, index) => {
    console.log(`\n${index + 1}. ${result.url}`);
    console.log(`   Success: ${result.success ? '✓' : '✗'}`);

    if (result.success) {
      console.log(`   Status: OK`);
    } else {
      console.log(`   Error: ${result.error}`);
    }
  });
}

async function example7_IntegrationExample() {
  console.log('\n' + '='.repeat(80));
  console.log('Example 7: Integration with Scraping Results');
  console.log('='.repeat(80));

  const domDetailer = new DomDetailerService();

  // Simulate scraped URLs
  const scrapedUrls = [
    { url: 'https://example.com/page', netlinkId: 1, linkType: 'dofollow' },
    { url: 'https://test.com/blog', netlinkId: 2, linkType: 'nofollow' },
    { url: 'https://demo.org/post', netlinkId: 3, linkType: 'dofollow' },
  ];

  console.log(`\nChecking DomDetailer for ${scrapedUrls.length} scraped URLs...`);

  const urls = scrapedUrls.map(s => s.url);
  const domDetailerResults = await domDetailer.checkDomainsBatchConcurrent(urls, 3);

  // Create map for easy lookup
  const resultMap = domDetailer.getResultMap(domDetailerResults);

  // Combine scraped data with DomDetailer data
  const combined = scrapedUrls.map(scraped => ({
    netlinkId: scraped.netlinkId,
    url: scraped.url,
    linkType: scraped.linkType,
    domDetailer: resultMap.get(scraped.url),
  }));

  console.log('\nCombined Results:');
  combined.forEach((item, index) => {
    console.log(`\n${index + 1}. Netlink ID: ${item.netlinkId}`);
    console.log(`   URL: ${item.url}`);
    console.log(`   Link Type: ${item.linkType}`);
    console.log(`   DomDetailer: ${item.domDetailer?.success ? '✓ Success' : '✗ Failed'}`);
    if (item.domDetailer?.success) {
      console.log(`   DomDetailer Data: Available`);
    } else if (item.domDetailer?.error) {
      console.log(`   DomDetailer Error: ${item.domDetailer.error}`);
    }
  });
}

async function main() {
  console.log('\n' + '='.repeat(80));
  console.log('DOMDETAILER SERVICE - TYPESCRIPT EXAMPLES');
  console.log('='.repeat(80));

  try {
    await example1_BasicUsage();
    await example2_CustomConfiguration();
    await example3_BatchProcessing();
    await example4_ConcurrentProcessing();
    await example5_ResultMap();
    await example6_ErrorHandling();
    await example7_IntegrationExample();

    console.log('\n' + '='.repeat(80));
    console.log('ALL EXAMPLES COMPLETED');
    console.log('='.repeat(80));
  } catch (error) {
    console.error('\nFatal error:', error);
    process.exit(1);
  }
}

// Run examples
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length > 0) {
    const exampleNum = args[0];
    const examples: { [key: string]: () => Promise<void> } = {
      '1': example1_BasicUsage,
      '2': example2_CustomConfiguration,
      '3': example3_BatchProcessing,
      '4': example4_ConcurrentProcessing,
      '5': example5_ResultMap,
      '6': example6_ErrorHandling,
      '7': example7_IntegrationExample,
    };

    if (examples[exampleNum]) {
      examples[exampleNum]().catch(error => {
        console.error('Error:', error);
        process.exit(1);
      });
    } else {
      console.log(`Invalid example number: ${exampleNum}`);
      console.log('Available examples: 1-7');
      console.log('Usage: ts-node src/examples/domdetailer-example.ts [1-7]');
      console.log('       ts-node src/examples/domdetailer-example.ts  (run all)');
    }
  } else {
    main();
  }
}
