# Netlink Service Guide

## Overview

The `NetlinkService` automatically fetches paginated netlink data from the Dashboard API. It handles all pagination logic, iterating through pages until `hasNextPage` becomes `false`.

## Features

- ✅ **Automatic pagination** - Loops through all pages automatically
- ✅ **Progress tracking** - Real-time callbacks for monitoring progress
- ✅ **Batch processing** - Memory-efficient processing for large datasets
- ✅ **Retry logic** - Automatic retries with exponential backoff
- ✅ **Page range fetching** - Fetch specific page ranges
- ✅ **Flexible configuration** - Customizable limits, start pages, and more
- ✅ **Error handling** - Graceful handling of failed pages

## API Endpoint

The service fetches from: `/netlink/all/paginated`

**Request Parameters:**
- `page` - Page number (starts at 1)
- `limit` - Items per page (default: 100)

**Response Format:**
```typescript
{
  data: NetlinkItem[],
  pagination: {
    currentPage: number,
    limit: number,
    totalItems: number,
    totalPages: number,
    remainingPages: number,
    hasNextPage: boolean,
    hasPreviousPage: boolean
  }
}
```

## Usage

### Basic Injection

```typescript
import { Injectable } from '@nestjs/common';
import { NetlinkService } from './services/netlink.service';

@Injectable()
export class MyService {
  constructor(private readonly netlinkService: NetlinkService) {}

  async processNetlinks() {
    const allNetlinks = await this.netlinkService.fetchAllNetlinks();
    // Process the data...
  }
}
```

## Methods

### 1. fetchAllNetlinks()

Fetch all netlinks across all pages automatically.

```typescript
// Simple: Fetch everything
const allNetlinks = await netlinkService.fetchAllNetlinks();

// With custom limit
const netlinks = await netlinkService.fetchAllNetlinks({
  limit: 100
});

// Start from specific page
const fromPage5 = await netlinkService.fetchAllNetlinks({
  startPage: 5,
  limit: 100
});

// Limit total pages fetched
const limitedData = await netlinkService.fetchAllNetlinks({
  limit: 100,
  maxPages: 20 // Only fetch first 20 pages
});

// With progress tracking
const data = await netlinkService.fetchAllNetlinks({
  limit: 100,
  onProgress: (currentPage, totalPages, totalItems) => {
    const percentage = ((currentPage / totalPages) * 100).toFixed(1);
    console.log(`Progress: ${percentage}% - ${totalItems} items fetched`);
  }
});

// With page-by-page callback
const netlinks = await netlinkService.fetchAllNetlinks({
  limit: 100,
  onPageFetched: (page, totalPages, itemCount) => {
    console.log(`Page ${page}/${totalPages}: ${itemCount} items`);
  }
});
```

### 2. fetchPage()

Fetch a single specific page.

```typescript
// Fetch page 1
const page1 = await netlinkService.fetchPage(1, 100);
console.log(`Fetched ${page1.data.length} items`);
console.log(`Total pages: ${page1.pagination.totalPages}`);
console.log(`Has next: ${page1.pagination.hasNextPage}`);

// Fetch page 5
const page5 = await netlinkService.fetchPage(5, 100);
```

### 3. fetchAllWithRetry()

Fetch all netlinks with automatic retry logic for failed requests.

```typescript
// Fetch with default 3 retries
const netlinks = await netlinkService.fetchAllWithRetry({
  limit: 100
});

// Custom retry count
const data = await netlinkService.fetchAllWithRetry({
  limit: 100,
  maxRetries: 5
});

// With progress tracking and retries
const allData = await netlinkService.fetchAllWithRetry({
  limit: 100,
  maxRetries: 3,
  onProgress: (page, total, items) => {
    console.log(`Page ${page}/${total}: ${items} items`);
  }
});
```

### 4. fetchInBatches()

Memory-efficient batch processing - process data in chunks instead of loading everything into memory.

```typescript
// Process 10 pages at a time
await netlinkService.fetchInBatches(
  10, // pages per batch
  async (batch, batchNumber) => {
    console.log(`Processing batch ${batchNumber}: ${batch.length} items`);

    // Save batch to database
    await database.saveBatch(batch);

    // Or write to file
    await fs.writeFile(`batch-${batchNumber}.json`, JSON.stringify(batch));

    // Or process items
    await processBatch(batch);
  },
  {
    limit: 100,
    startPage: 1
  }
);

// With custom batch size and processing
let totalProcessed = 0;
await netlinkService.fetchInBatches(
  5, // 5 pages per batch
  async (batch, batchNumber) => {
    // Your processing logic
    for (const item of batch) {
      await processItem(item);
    }

    totalProcessed += batch.length;
    console.log(`Processed ${totalProcessed} items so far`);
  }
);
```

### 5. fetchPageRange()

Fetch a specific range of pages.

```typescript
// Fetch pages 1-10
const range = await netlinkService.fetchPageRange(1, 10, 100);

// Fetch pages 20-30
const midRange = await netlinkService.fetchPageRange(20, 30, 100);

// Continues even if individual pages fail
const resilientRange = await netlinkService.fetchPageRange(1, 50, 100);
```

### 6. getPaginationInfo()

Get pagination metadata without fetching all data.

```typescript
const info = await netlinkService.getPaginationInfo(100);

console.log(`Total Items: ${info.totalItems}`);
console.log(`Total Pages: ${info.totalPages}`);
console.log(`Items per page: ${info.limit}`);
console.log(`Has more pages: ${info.hasNextPage}`);
```

### 7. getTotalCount()

Get the total count of items.

```typescript
const totalCount = await netlinkService.getTotalCount();
console.log(`Total netlinks available: ${totalCount}`);
```

### 8. hasData()

Check if any data is available.

```typescript
const hasData = await netlinkService.hasData();

if (hasData) {
  console.log('Data is available, proceeding...');
  const netlinks = await netlinkService.fetchAllNetlinks();
} else {
  console.log('No data available');
}
```

## Complete Examples

### Example 1: Simple Fetch All

```typescript
@Injectable()
export class DataSyncService {
  constructor(private readonly netlinkService: NetlinkService) {}

  async syncAllNetlinks() {
    console.log('Starting netlink sync...');

    const netlinks = await this.netlinkService.fetchAllNetlinks({
      limit: 100,
      onProgress: (page, total, items) => {
        console.log(`Progress: ${page}/${total} pages - ${items} items`);
      }
    });

    console.log(`Sync complete! ${netlinks.length} netlinks fetched`);
    return netlinks;
  }
}
```

### Example 2: Progress Tracking with Time Estimation

```typescript
async syncWithProgress() {
  const startTime = Date.now();

  const netlinks = await this.netlinkService.fetchAllNetlinks({
    limit: 100,
    onProgress: (currentPage, totalPages, totalItems) => {
      const elapsed = (Date.now() - startTime) / 1000;
      const rate = currentPage / elapsed; // pages per second
      const remaining = totalPages - currentPage;
      const eta = remaining / rate;

      console.log(
        `Page ${currentPage}/${totalPages} | ` +
        `Items: ${totalItems} | ` +
        `Elapsed: ${elapsed.toFixed(1)}s | ` +
        `ETA: ${eta.toFixed(1)}s`
      );
    }
  });

  return netlinks;
}
```

### Example 3: Batch Processing with Database Saves

```typescript
async syncInBatches() {
  let totalSaved = 0;

  await this.netlinkService.fetchInBatches(
    20, // 20 pages per batch
    async (batch, batchNumber) => {
      console.log(`Saving batch ${batchNumber}: ${batch.length} items`);

      // Save to database in transactions
      await this.database.transaction(async (trx) => {
        for (const item of batch) {
          await trx('netlinks').insert(item);
        }
      });

      totalSaved += batch.length;
      console.log(`Total saved: ${totalSaved}`);
    },
    { limit: 100 }
  );

  console.log(`Completed! Saved ${totalSaved} netlinks`);
}
```

### Example 4: Retry Logic with Error Handling

```typescript
async reliableFetch() {
  try {
    const netlinks = await this.netlinkService.fetchAllWithRetry({
      limit: 100,
      maxRetries: 5,
      onPageFetched: (page, total, count) => {
        console.log(`✓ Page ${page}/${total}: ${count} items`);
      }
    });

    return { success: true, data: netlinks };
  } catch (error) {
    console.error('Failed after all retries:', error.message);
    return { success: false, error: error.message };
  }
}
```

### Example 5: Incremental Sync (Only New Data)

```typescript
async incrementalSync() {
  // Get last synced page from database
  const lastSyncedPage = await this.getLastSyncedPage();

  console.log(`Resuming from page ${lastSyncedPage + 1}...`);

  const newNetlinks = await this.netlinkService.fetchAllNetlinks({
    limit: 100,
    startPage: lastSyncedPage + 1,
    onPageFetched: async (page, total, count) => {
      console.log(`Page ${page}/${total}: ${count} new items`);
      // Update last synced page in database
      await this.updateLastSyncedPage(page);
    }
  });

  return newNetlinks;
}
```

### Example 6: Fetch with Filtering

```typescript
async fetchAndFilter(filterFn: (item: NetlinkItem) => boolean) {
  let filteredItems: NetlinkItem[] = [];

  await this.netlinkService.fetchInBatches(
    10,
    async (batch, batchNumber) => {
      // Filter items in this batch
      const filtered = batch.filter(filterFn);
      filteredItems.push(...filtered);

      console.log(
        `Batch ${batchNumber}: ${filtered.length}/${batch.length} items matched filter`
      );
    }
  );

  return filteredItems;
}

// Usage
const activeNetlinks = await this.fetchAndFilter(
  item => item.status === 'active'
);
```

### Example 7: Parallel Processing

```typescript
async parallelProcess() {
  // First, get all data
  const allNetlinks = await this.netlinkService.fetchAllNetlinks({
    limit: 100
  });

  // Process in parallel chunks
  const chunkSize = 100;
  const chunks = this.chunkArray(allNetlinks, chunkSize);

  await Promise.all(
    chunks.map(async (chunk, index) => {
      console.log(`Processing chunk ${index + 1}/${chunks.length}`);
      await this.processChunk(chunk);
    })
  );

  console.log('All chunks processed!');
}

private chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}
```

## Testing

### Run Basic Tests

```bash
npm run test:netlink
```

### Run Specific Examples

```bash
# Fetch all netlinks
npm run test:netlink all

# Test retry logic
npm run test:netlink retry

# Test batch processing
npm run test:netlink batch

# Show usage examples
npm run test:netlink examples
```

## Performance Considerations

### Memory Usage

For large datasets, use `fetchInBatches()` instead of `fetchAllNetlinks()`:

```typescript
// ❌ Bad: Loads everything into memory
const all = await netlinkService.fetchAllNetlinks(); // 100,000+ items!

// ✅ Good: Processes in batches
await netlinkService.fetchInBatches(10, async (batch) => {
  await processBatch(batch); // Only 1,000 items in memory at a time
});
```

### Request Rate

The service fetches pages sequentially to avoid overwhelming the API. For faster parallel fetching:

```typescript
// Fetch multiple page ranges in parallel
const [range1, range2, range3] = await Promise.all([
  netlinkService.fetchPageRange(1, 10),
  netlinkService.fetchPageRange(11, 20),
  netlinkService.fetchPageRange(21, 30)
]);

const allData = [...range1, ...range2, ...range3];
```

### Timeout Configuration

Adjust timeout for slow APIs:

```typescript
// In the DashboardHttpClient
dashboardClient.setTimeout(60000); // 60 seconds

// Then use NetlinkService
const data = await netlinkService.fetchAllNetlinks();
```

## Error Handling

### Handle Individual Page Failures

The service continues fetching even if individual pages fail:

```typescript
try {
  const data = await netlinkService.fetchAllNetlinks({
    onPageFetched: (page, total, count) => {
      if (count === 0) {
        console.warn(`Warning: Page ${page} returned no data`);
      }
    }
  });
} catch (error) {
  console.error('Fetching failed:', error.message);
  // Partial data may have been collected
}
```

### Use Retry Logic

For unreliable connections:

```typescript
const data = await netlinkService.fetchAllWithRetry({
  maxRetries: 5,
  limit: 100
});
```

### Graceful Degradation

```typescript
async safelyFetchNetlinks() {
  try {
    // Try to fetch all
    return await this.netlinkService.fetchAllNetlinks();
  } catch (error) {
    console.error('Full fetch failed, trying first page only...');

    try {
      // Fallback: fetch just first page
      const firstPage = await this.netlinkService.fetchPage(1, 100);
      return firstPage.data;
    } catch (fallbackError) {
      console.error('Complete failure:', fallbackError.message);
      return [];
    }
  }
}
```

## Troubleshooting

### "No response received from API"

- Dashboard API is not running
- Check `DASHBOARD_BASE_URL` in `.env`
- Verify network connectivity

### Slow Performance

- Reduce `limit` per page (try 50 instead of 100)
- Use batch processing instead of loading all at once
- Increase timeout: `dashboardClient.setTimeout(90000)`

### Out of Memory

- Use `fetchInBatches()` instead of `fetchAllNetlinks()`
- Reduce batch size
- Process data incrementally

### Partial Data Fetched

- Check logs for specific page failures
- Use `fetchAllWithRetry()` for automatic retries
- Verify API stability

## Files Reference

- **Service**: `src/modules/paperclub/services/netlink.service.ts`
- **Test**: `src/cli/test-netlink.ts`
- **Module**: `src/modules/paperclub/paperclub.module.ts`

## Next Steps

1. Configure `DASHBOARD_BASE_URL` in `.env`
2. Inject `NetlinkService` into your services
3. Use `fetchAllNetlinks()` for simple cases
4. Use `fetchInBatches()` for large datasets
5. Add progress tracking for better UX
6. Implement error handling and retries

For more examples, see `src/cli/test-netlink.ts`
