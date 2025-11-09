# Netlink Scraper Setup Guide

## Overview

The `NetlinkScraperService` is ready to scrape every single netlink URL from your dashboard. The infrastructure is set up and waiting for you to define **what data you want to extract** from each page.

## Current Setup

✅ **Infrastructure Complete:**
- Fetches all netlinks from `/netlink/all/paginated`
- Extracts `url_bought` field from each netlink object
- Uses Lightpanda browser for scraping
- Handles pagination automatically
- Progress tracking and error handling
- Batch processing support
- Retry logic with exponential backoff

## Next Step: Define Your Scraping Logic

You need to implement the `extractData()` method in:
**File:** `src/modules/paperclub/services/netlink-scraper.service.ts`

### Current Placeholder

```typescript
private async extractData(page: Page, url: string): Promise<Partial<ScrapedNetlinkData>> {
  // TODO: Implement your scraping logic here

  return {
    // Add your extracted data here
  };
}
```

### What to Tell Me

**Tell me what data you want to scrape from each URL**, for example:

- Page title?
- Main heading (H1)?
- Meta description?
- All text content?
- Specific elements (by class, id, or selector)?
- Images?
- Links?
- Product information?
- Prices?
- Contact information?
- Specific JSON data?
- Any other content?

## Data Structure

### Input (Netlink Object)

Each netlink from the dashboard looks like this:

```json
{
  "id": 123,
  "url_bought": "https://example.com",
  // ... other fields
}
```

The service automatically extracts `url_bought` and navigates to it.

### Output (Scraped Data)

Currently returns:

```typescript
{
  url: string,              // The scraped URL
  netlinkId: number,        // ID from dashboard
  scrapedAt: string,        // Timestamp
  success: boolean,         // Whether scraping succeeded
  error?: string,           // Error message if failed

  // YOUR CUSTOM DATA GOES HERE
  // Define what you want to extract
}
```

## Example Implementations

### Example 1: Basic Page Info

```typescript
private async extractData(page: Page, url: string) {
  const title = await page.title();
  const heading = await page.locator('h1').first().textContent();

  return {
    title,
    heading,
  };
}
```

### Example 2: Meta Tags

```typescript
private async extractData(page: Page, url: string) {
  const title = await page.title();
  const description = await page.locator('meta[name="description"]').getAttribute('content');
  const keywords = await page.locator('meta[name="keywords"]').getAttribute('content');

  return {
    title,
    description,
    keywords,
  };
}
```

### Example 3: Complex Content

```typescript
private async extractData(page: Page, url: string) {
  // Wait for content to load
  await page.waitForSelector('body', { timeout: 5000 });

  const data = await page.evaluate(() => {
    return {
      title: document.querySelector('h1')?.textContent?.trim(),
      paragraphs: Array.from(document.querySelectorAll('p')).map(p => p.textContent?.trim()),
      images: Array.from(document.querySelectorAll('img')).map(img => ({
        src: img.src,
        alt: img.alt,
      })),
      links: Array.from(document.querySelectorAll('a')).map(a => ({
        text: a.textContent?.trim(),
        href: a.href,
      })),
    };
  });

  return data;
}
```

### Example 4: Product Information

```typescript
private async extractData(page: Page, url: string) {
  try {
    await page.waitForSelector('.product', { timeout: 5000 });

    const productData = await page.evaluate(() => {
      return {
        productName: document.querySelector('.product-name')?.textContent?.trim(),
        price: document.querySelector('.price')?.textContent?.trim(),
        description: document.querySelector('.description')?.textContent?.trim(),
        availability: document.querySelector('.availability')?.textContent?.trim(),
        images: Array.from(document.querySelectorAll('.product-image')).map(img => img.src),
      };
    });

    return productData;
  } catch (error) {
    return {
      extractionError: 'Product selectors not found',
    };
  }
}
```

## Testing the Scraper

### Step 1: Test on Sample URLs

```bash
npm run test:netlink-scraper sample
```

This will:
- Fetch 3 sample netlinks
- Scrape each URL
- Show results
- Tell you if extraction worked

### Step 2: Run Full Scrape

```bash
npm run test:netlink-scraper save
```

This will:
- Fetch ALL netlinks from dashboard
- Scrape each `url_bought`
- Save results to `scraped-data/` directory
- Show statistics

### Step 3: Batch Processing

```bash
npm run test:netlink-scraper batch
```

This will:
- Process in batches (memory efficient)
- Save each batch to separate file
- Good for large datasets

## Available Commands

```bash
# Test on sample netlinks
npm run test:netlink-scraper sample

# Batch scraping example
npm run test:netlink-scraper batch

# Scrape all and save to file
npm run test:netlink-scraper save

# Show scraping examples
npm run test:netlink-scraper examples

# Show usage patterns
npm run test:netlink-scraper patterns
```

## Service Usage

### In Your Code

```typescript
import { NetlinkScraperService } from './services/netlink-scraper.service';

@Injectable()
export class MyService {
  constructor(private readonly scraperService: NetlinkScraperService) {}

  async scrapeAllNetlinks() {
    const stats = await this.scraperService.scrapeAllNetlinks({
      concurrency: 3,     // Scrape 3 URLs at once
      timeout: 30000,     // 30 second timeout per page
      retries: 2,         // Retry failed pages twice
      delay: 1000,        // 1 second delay between requests

      onProgress: (current, total, url) => {
        console.log(`${current}/${total}: ${url}`);
      },

      onSuccess: async (data) => {
        // Save to database, process, etc.
        await this.saveToDatabase(data);
      },
    });

    return stats;
  }
}
```

## Configuration Options

```typescript
{
  concurrency: 3,        // How many URLs to scrape simultaneously
  timeout: 30000,        // Timeout per page (milliseconds)
  retries: 3,           // How many times to retry failed pages
  delay: 1000,          // Delay between requests (milliseconds)
  skipErrors: true,     // Continue even if some pages fail

  onProgress: (current, total, url) => {},  // Progress callback
  onSuccess: (data) => {},                   // Success callback
  onError: (url, error) => {},              // Error callback
}
```

## Scraping Statistics

After scraping, you get detailed stats:

```typescript
{
  total: 7959,          // Total netlinks
  successful: 7850,     // Successfully scraped
  failed: 109,          // Failed to scrape
  skipped: 0,          // Skipped
  duration: 3600000,   // Time taken (ms)
  startTime: Date,     // Start time
  endTime: Date,       // End time
  errors: [            // Array of errors
    { url: '...', error: '...' }
  ]
}
```

## Performance Tips

### For Large Datasets

```typescript
// Use batch processing to avoid memory issues
await scraperService.scrapeInBatches(
  20, // Process 20 pages at a time
  async (results, batchNumber) => {
    // Save batch immediately
    await saveToFile(`batch-${batchNumber}.json`, results);
  }
);
```

### Adjust Concurrency

```typescript
// Low concurrency (safe, slower)
{ concurrency: 1 }

// Medium concurrency (balanced)
{ concurrency: 3 }

// High concurrency (fast, but may hit rate limits)
{ concurrency: 10 }
```

### Handle Slow Pages

```typescript
{
  timeout: 60000,  // Increase timeout for slow pages
  retries: 5,      // More retries for unstable connections
}
```

## Error Handling

The service automatically:
- ✅ Retries failed pages
- ✅ Continues scraping even if some pages fail
- ✅ Logs all errors
- ✅ Returns error details in results

## Files

- **Service:** `src/modules/paperclub/services/netlink-scraper.service.ts`
- **Test:** `src/cli/test-netlink-scraper.ts`
- **Output:** `scraped-data/` directory (auto-created)

## Ready to Start

**What I need from you:**

Tell me what data you want to scrape from each `url_bought`, and I'll implement the `extractData()` method for you.

For example:
- "I want to scrape the page title, meta description, and all paragraph text"
- "I want to extract product name, price, and images"
- "I want to get all links and headings"
- "I want to find specific elements with class 'xyz'"

Once you tell me, I'll update the `extractData()` method with the exact selectors and logic you need!
