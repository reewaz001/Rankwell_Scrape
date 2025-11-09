import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { NetlinkService } from '../modules/paperclub/services/netlink.service';

/**
 * Test script for Netlink Service
 *
 * This script demonstrates:
 * 1. Fetching pagination info
 * 2. Fetching all pages automatically
 * 3. Progress tracking
 * 4. Batch processing
 * 5. Fetching specific page ranges
 */
async function testNetlinkService() {
  console.log('='.repeat(60));
  console.log('TESTING NETLINK SERVICE');
  console.log('='.repeat(60));

  const app = await NestFactory.createApplicationContext(AppModule);
  const netlinkService = app.get(NetlinkService);

  try {
    // Test 1: Get pagination info
    console.log('\n1. Getting pagination info...');
    try {
      const paginationInfo = await netlinkService.getPaginationInfo(100);
      console.log('✓ Pagination info retrieved:');
      console.log(`   Total Items: ${paginationInfo.totalItems}`);
      console.log(`   Total Pages: ${paginationInfo.totalPages}`);
      console.log(`   Items per page: ${paginationInfo.limit}`);
      console.log(`   Has next page: ${paginationInfo.hasNextPage}`);
    } catch (error) {
      console.log('⚠ Failed to get pagination info (server may not be running)');
      console.log(`   Error: ${error.message}`);
      console.log('\nSkipping remaining tests as API is not available.');
      await app.close();
      return;
    }

    // Test 2: Get total count
    console.log('\n2. Getting total count...');
    const totalCount = await netlinkService.getTotalCount();
    console.log(`✓ Total netlinks available: ${totalCount}`);

    // Test 3: Check if data exists
    console.log('\n3. Checking if data exists...');
    const hasData = await netlinkService.hasData();
    console.log(`✓ Has data: ${hasData}`);

    // Test 4: Fetch first page only
    console.log('\n4. Fetching first page only...');
    const firstPage = await netlinkService.fetchPage(1, 10);
    console.log(`✓ First page fetched: ${firstPage.data.length} items`);
    console.log('   Sample item:', JSON.stringify(firstPage.data[0], null, 2));

    // Test 5: Fetch specific page range (pages 1-3)
    console.log('\n5. Fetching pages 1-3...');
    const pageRangeData = await netlinkService.fetchPageRange(1, 3, 10);
    console.log(`✓ Page range fetched: ${pageRangeData.length} items`);

    // Test 6: Fetch all pages with progress tracking (limited to first 5 pages for demo)
    console.log('\n6. Fetching all pages with progress tracking (limited to 5 pages)...');
    const allData = await netlinkService.fetchAllNetlinks({
      limit: 10,
      maxPages: 5,
      onPageFetched: (page, totalPages, itemCount) => {
        const progress = ((page / Math.min(5, totalPages)) * 100).toFixed(1);
        console.log(`   Progress: ${progress}% - Page ${page} - ${itemCount} items fetched`);
      }
    });
    console.log(`✓ Total items fetched: ${allData.length}`);

    // Test 7: Batch processing (limited for demo)
    console.log('\n7. Testing batch processing (2 pages per batch, 4 pages total)...');
    let batchCount = 0;
    await netlinkService.fetchInBatches(
      2, // 2 pages per batch
      async (batch, batchNumber) => {
        batchCount++;
        console.log(`   Batch ${batchNumber} processed: ${batch.length} items`);
        // Here you would normally save to database, file, etc.
      },
      {
        limit: 10,
        startPage: 1,
      }
    );
    console.log(`✓ Processed ${batchCount} batches`);

    console.log('\n' + '='.repeat(60));
    console.log('ALL TESTS COMPLETED SUCCESSFULLY');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n✗ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await app.close();
  }
}

/**
 * Example: Fetch all netlinks and process them
 */
async function exampleFetchAll() {
  console.log('\n' + '='.repeat(60));
  console.log('EXAMPLE: FETCH ALL NETLINKS');
  console.log('='.repeat(60));

  const app = await NestFactory.createApplicationContext(AppModule);
  const netlinkService = app.get(NetlinkService);

  try {
    console.log('\nFetching all netlinks with progress tracking...\n');

    const startTime = Date.now();

    const allNetlinks = await netlinkService.fetchAllNetlinks({
      limit: 100,
      onProgress: (currentPage, totalPages, totalItems) => {
        const percentage = ((currentPage / totalPages) * 100).toFixed(1);
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        process.stdout.write(
          `\r   Progress: ${percentage}% | Page ${currentPage}/${totalPages} | ` +
          `Items: ${totalItems} | Elapsed: ${elapsed}s`
        );
      }
    });

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n\n✓ Completed! Fetched ${allNetlinks.length} netlinks in ${totalTime}s`);

    // Example: Process the data
    console.log('\nExample data processing:');
    console.log(`   First item:`, allNetlinks[0]);
    console.log(`   Last item:`, allNetlinks[allNetlinks.length - 1]);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await app.close();
  }
}

/**
 * Example: Fetch with retry logic
 */
async function exampleFetchWithRetry() {
  console.log('\n' + '='.repeat(60));
  console.log('EXAMPLE: FETCH WITH RETRY LOGIC');
  console.log('='.repeat(60));

  const app = await NestFactory.createApplicationContext(AppModule);
  const netlinkService = app.get(NetlinkService);

  try {
    console.log('\nFetching with automatic retry on failures...\n');

    const allNetlinks = await netlinkService.fetchAllWithRetry({
      limit: 100,
      maxRetries: 3,
      onPageFetched: (page, totalPages) => {
        console.log(`   Page ${page}/${totalPages} fetched`);
      }
    });

    console.log(`\n✓ Successfully fetched ${allNetlinks.length} netlinks`);

  } catch (error) {
    console.error('All retry attempts failed:', error.message);
  } finally {
    await app.close();
  }
}

/**
 * Example: Memory-efficient batch processing
 */
async function exampleBatchProcessing() {
  console.log('\n' + '='.repeat(60));
  console.log('EXAMPLE: MEMORY-EFFICIENT BATCH PROCESSING');
  console.log('='.repeat(60));

  const app = await NestFactory.createApplicationContext(AppModule);
  const netlinkService = app.get(NetlinkService);

  try {
    console.log('\nProcessing netlinks in batches to save memory...\n');

    let totalProcessed = 0;

    await netlinkService.fetchInBatches(
      10, // 10 pages per batch
      async (batch, batchNumber) => {
        console.log(`   Processing batch ${batchNumber}: ${batch.length} items`);

        // Example: Save batch to database, file, or process
        // await saveToDatabase(batch);
        // await writeToFile(batch);
        // await processItems(batch);

        totalProcessed += batch.length;
        console.log(`   Total processed so far: ${totalProcessed}`);
      },
      {
        limit: 100
      }
    );

    console.log(`\n✓ All batches processed! Total items: ${totalProcessed}`);

  } catch (error) {
    console.error('Batch processing failed:', error.message);
  } finally {
    await app.close();
  }
}

/**
 * Usage examples showcase
 */
function showUsageExamples() {
  console.log('\n' + '='.repeat(60));
  console.log('USAGE EXAMPLES');
  console.log('='.repeat(60));

  const examples = `
// 1. Simple: Fetch all netlinks
const allNetlinks = await netlinkService.fetchAllNetlinks();

// 2. With progress tracking
const netlinks = await netlinkService.fetchAllNetlinks({
  limit: 100,
  onProgress: (currentPage, totalPages, totalItems) => {
    console.log(\`Page \${currentPage}/\${totalPages} - \${totalItems} items\`);
  }
});

// 3. Fetch specific pages only
const pageRange = await netlinkService.fetchPageRange(1, 10, 100);

// 4. Get just the count
const count = await netlinkService.getTotalCount();

// 5. With retry logic for reliability
const data = await netlinkService.fetchAllWithRetry({
  limit: 100,
  maxRetries: 3
});

// 6. Memory-efficient batch processing
await netlinkService.fetchInBatches(
  10, // pages per batch
  async (batch, batchNumber) => {
    await processBatch(batch);
  }
);

// 7. Limit number of pages fetched
const limitedData = await netlinkService.fetchAllNetlinks({
  limit: 100,
  maxPages: 20 // Only fetch first 20 pages
});

// 8. Start from a specific page
const fromPage5 = await netlinkService.fetchAllNetlinks({
  startPage: 5,
  limit: 100
});
`;

  console.log(examples);
}

// Run tests
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'all':
      exampleFetchAll().catch(console.error);
      break;
    case 'retry':
      exampleFetchWithRetry().catch(console.error);
      break;
    case 'batch':
      exampleBatchProcessing().catch(console.error);
      break;
    case 'examples':
      showUsageExamples();
      break;
    default:
      testNetlinkService()
        .then(() => {
          console.log('\nRun with additional commands:');
          console.log('  npm run test:netlink all     - Fetch all netlinks');
          console.log('  npm run test:netlink retry   - Fetch with retry logic');
          console.log('  npm run test:netlink batch   - Batch processing example');
          console.log('  npm run test:netlink examples - Show usage examples');
        })
        .catch(console.error);
  }
}

export { testNetlinkService };
