# Netlink Scraping Guide - Find Landing Page Links

## Overview

The NetlinkScraperService now scrapes each `url_bought` and searches for `<a>` tags that contain the `landing_page` URL. It handles various URL formats intelligently.

## What It Does

For each netlink from the dashboard:
1. **Fetches** the `url_bought` URL
2. **Extracts** all `<a>` tags from the page
3. **Searches** for links matching the `landing_page` URL
4. **Returns** the matching `<a>` tag with full details

## URL Matching Logic

The scraper uses intelligent URL matching that handles:

### ✅ Exact Matches
```
landing_page: "example.com"
link href:    "https://example.com"
→ MATCH (exact)
```

### ✅ Protocol Variations
```
landing_page: "https://example.com"
link href:    "http://example.com"
→ MATCH (exact - protocol ignored)
```

### ✅ www. Variations
```
landing_page: "www.example.com"
link href:    "example.com"
→ MATCH (exact - www ignored)
```

### ✅ Domain Matches
```
landing_page: "example.com"
link href:    "https://example.com/page"
→ MATCH (domain)
```

### ✅ Subdomain Matches
```
landing_page: "blog.example.com"
link href:    "https://blog.example.com/post"
→ MATCH (subdomain)
```

### ❌ Non-Matches
```
landing_page: "example.com"
link href:    "different.com"
→ NO MATCH
```

## Data Structure

### Input: Netlink Object

From dashboard API:
```json
{
  "id": 123,
  "url_bought": "https://publisher-site.com/article",
  "landing_page": "https://target-site.com"
}
```

### Output: Scraped Data

```json
{
  "url": "https://publisher-site.com/article",
  "netlinkId": 123,
  "landingPage": "https://target-site.com",
  "scrapedAt": "2025-10-31T12:00:00.000Z",
  "success": true,

  "foundLink": {
    "href": "https://target-site.com/page",
    "text": "Visit Our Site",
    "outerHTML": "<a href=\"https://target-site.com/page\">Visit Our Site</a>",
    "matched": true,
    "matchType": "domain"
  },

  "allLinksCount": 47
}
```

### If No Match Found

```json
{
  "url": "https://publisher-site.com/article",
  "netlinkId": 123,
  "landingPage": "https://target-site.com",
  "scrapedAt": "2025-10-31T12:00:00.000Z",
  "success": true,

  "foundLink": {
    "href": "",
    "text": "",
    "outerHTML": "",
    "matched": false
  },

  "allLinksCount": 47
}
```

## Usage

### 1. Test on Sample Netlinks

```bash
npm run test:netlink-scraper sample
```

This will:
- Fetch 3 sample netlinks from dashboard
- Scrape each `url_bought`
- Search for `landing_page` URL in links
- Show results

Expected output:
```
Sample Results:

  1. https://publisher-site.com/article
     Success: true
     Landing Page: https://target-site.com
     Match Found: true (domain match)
     Link: <a href="...">...</a>
```

### 2. Scrape All Netlinks

```bash
npm run test:netlink-scraper save
```

This will:
- Fetch ALL netlinks from dashboard
- Scrape each URL
- Save results to `scraped-data/netlinks-scraped-YYYY-MM-DD.json`
- Show statistics

### 3. Batch Processing

```bash
npm run test:netlink-scraper batch
```

This will:
- Process netlinks in batches
- Save each batch to separate file
- Memory efficient for large datasets

## Example Results

### Successful Match

```json
{
  "url": "https://techblog.com/review",
  "netlinkId": 456,
  "landingPage": "https://product-site.com",
  "scrapedAt": "2025-10-31T12:30:00.000Z",
  "success": true,
  "foundLink": {
    "href": "https://product-site.com/buy-now",
    "text": "Buy Now",
    "outerHTML": "<a href=\"https://product-site.com/buy-now\" class=\"cta-button\">Buy Now</a>",
    "matched": true,
    "matchType": "domain"
  },
  "allLinksCount": 32
}
```

### No Match Found

```json
{
  "url": "https://news-site.com/article",
  "netlinkId": 789,
  "landingPage": "https://target.com",
  "scrapedAt": "2025-10-31T12:31:00.000Z",
  "success": true,
  "foundLink": {
    "href": "",
    "text": "",
    "outerHTML": "",
    "matched": false
  },
  "allLinksCount": 28
}
```

### Failed Scrape

```json
{
  "url": "https://invalid-site.com/page",
  "netlinkId": 101,
  "landingPage": "https://target.com",
  "scrapedAt": "2025-10-31T12:32:00.000Z",
  "success": false,
  "error": "net::ERR_NAME_NOT_RESOLVED"
}
```

## Service Usage in Code

### Basic Usage

```typescript
import { NetlinkScraperService } from './services/netlink-scraper.service';

@Injectable()
export class MyService {
  constructor(private readonly scraperService: NetlinkScraperService) {}

  async findAllLinks() {
    const stats = await this.scraperService.scrapeAllNetlinks({
      concurrency: 3,
      timeout: 30000,
      retries: 2,

      onProgress: (current, total, url) => {
        console.log(`${current}/${total}: ${url}`);
      },

      onSuccess: async (data) => {
        if (data.foundLink?.matched) {
          console.log(`✓ Found link on ${data.url}`);
          console.log(`  Link: ${data.foundLink.href}`);
        } else {
          console.log(`✗ No link found on ${data.url}`);
        }
      },
    });

    return stats;
  }
}
```

### Filter Results

```typescript
async getOnlyMatchedLinks() {
  const allResults: ScrapedNetlinkData[] = [];

  await this.scraperService.scrapeAllNetlinks({
    concurrency: 3,
    onSuccess: (data) => {
      allResults.push(data);
    },
  });

  // Filter only successful matches
  const matched = allResults.filter(r => r.foundLink?.matched);

  console.log(`Found ${matched.length} pages with matching links`);

  return matched;
}
```

### Save to Database

```typescript
async scrapeAndSave() {
  await this.scraperService.scrapeAllNetlinks({
    concurrency: 3,
    onSuccess: async (data) => {
      // Save each result to database
      await this.database.scrapedLinks.insert({
        netlinkId: data.netlinkId,
        urlBought: data.url,
        landingPage: data.landingPage,
        linkFound: data.foundLink?.matched || false,
        linkHref: data.foundLink?.href,
        linkText: data.foundLink?.text,
        linkHtml: data.foundLink?.outerHTML,
        matchType: data.foundLink?.matchType,
        scrapedAt: data.scrapedAt,
      });
    },
  });
}
```

### Batch Processing with Analysis

```typescript
async analyzeLinkPresence() {
  let totalMatched = 0;
  let totalNotMatched = 0;
  const matchTypes = { exact: 0, domain: 0, subdomain: 0 };

  await this.scraperService.scrapeInBatches(
    20,
    async (results, batchNumber) => {
      for (const result of results) {
        if (result.foundLink?.matched) {
          totalMatched++;
          matchTypes[result.foundLink.matchType]++;
        } else {
          totalNotMatched++;
        }
      }

      console.log(`Batch ${batchNumber}: ${totalMatched} matched, ${totalNotMatched} not matched`);
    }
  );

  console.log('\nFinal Stats:');
  console.log(`  Matched: ${totalMatched}`);
  console.log(`  Not Matched: ${totalNotMatched}`);
  console.log(`  Match Types:`, matchTypes);
}
```

## Configuration Options

```typescript
{
  concurrency: 3,      // Scrape 3 URLs at once
  timeout: 30000,      // 30 seconds per page
  retries: 2,          // Retry failed pages 2 times
  delay: 1000,         // 1 second delay between requests
  skipErrors: true,    // Continue even if some pages fail

  onProgress: (current, total, url) => {
    // Track progress
  },

  onSuccess: (data) => {
    // Handle each successful scrape
  },

  onError: (url, error) => {
    // Handle errors
  }
}
```

## Statistics

After scraping, you get:

```typescript
{
  total: 7959,         // Total netlinks scraped
  successful: 7850,    // Successfully loaded pages
  failed: 109,         // Failed to load
  duration: 3600000,   // Time in milliseconds
  startTime: Date,
  endTime: Date,
  errors: [            // List of errors
    { url: '...', error: '...' }
  ]
}
```

## Match Type Meanings

- **`exact`**: URL matches exactly (ignoring protocol, www, trailing slash)
- **`domain`**: Link URL contains the landing page domain
- **`subdomain`**: Landing page is a subdomain of the link

## Troubleshooting

### No Matches Found

If you're getting no matches:

1. **Check landing_page format**
   ```bash
   # Run sample test to see actual data
   npm run test:netlink-scraper sample
   ```

2. **Verify URLs in dashboard**
   - Make sure `landing_page` field is populated
   - Check if URLs are correct

3. **Check scraped pages**
   - URLs might not have the link
   - Link might be dynamically loaded (increase timeout)

### Low Match Rate

If match rate is low:

1. **Increase timeout** - Links might load dynamically
   ```typescript
   { timeout: 60000 } // 60 seconds
   ```

2. **Wait for specific selector**
   - Modify `extractData()` to wait for links to load

3. **Check match logic**
   - URLs might have different format than expected

### Performance Issues

For large datasets:

```typescript
// Use batch processing
await scraperService.scrapeInBatches(10, async (results) => {
  await processImmediately(results);
});

// Or reduce concurrency
{ concurrency: 1 }
```

## Files

- **Service**: `src/modules/paperclub/services/netlink-scraper.service.ts`
- **Test**: `src/cli/test-netlink-scraper.ts`
- **Output**: `scraped-data/` directory

## Next Steps

1. **Test on samples**:
   ```bash
   npm run test:netlink-scraper sample
   ```

2. **Review results** to ensure matching works correctly

3. **Run full scrape**:
   ```bash
   npm run test:netlink-scraper save
   ```

4. **Analyze results** to see which netlinks have matching links

5. **Integrate with your workflow** (save to DB, generate reports, etc.)
