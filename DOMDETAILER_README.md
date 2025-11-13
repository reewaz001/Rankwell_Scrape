# DomDetailer Integration - Complete Guide

## Overview

The DomDetailer service has been fully integrated into the Netlink Scraper to automatically check domain information for each scraped URL. This TypeScript-based service calls the DomDetailer API and includes the results in the batch upsert to your backend.

## Features

✅ **Pure TypeScript** - No Python dependencies
✅ **NestJS Integration** - Seamless dependency injection
✅ **Batch Processing** - Check multiple domains efficiently
✅ **Concurrency Control** - Configurable parallel requests
✅ **Error Handling** - Graceful failure handling
✅ **Auto-Integration** - Automatically enriches scraping results
✅ **Rate Limiting** - Built-in delays to avoid API throttling

## Quick Start

### 1. Enable DomDetailer in Scraping

```typescript
const results = await scraperService.scrapeNetlinks(netlinks, {
  concurrency: 3,
  enableDomDetailer: true, // 👈 Enable it!
  domDetailerConcurrency: 3,
});
```

### 2. Test It

```bash
npm run test:domdetailer
```

That's it! Results now include DomDetailer data.

## Architecture

### Data Flow

```
1. Scrape URLs
   ↓
2. Check links (do-follow/no-follow)
   ↓
3. If enableDomDetailer = true:
   → Call DomDetailer API for each URL
   → Add results to scraped data
   ↓
4. Batch Upsert
   → POST to /netlink/additionalInfo/upsert
   → Includes: netlink_id, link_type, online_status, domdetailer_data
```

### Components

**DomDetailerService** (`src/common/domdetailer.service.ts`)
- Pure TypeScript NestJS service
- Uses axios for HTTP requests
- Provides sync/async batch methods
- Handles concurrency and rate limiting

**NetlinkScraperService** (`src/modules/paperclub/services/netlink-scraper.service.ts`)
- Integrated DomDetailer checking
- Enriches scraped results
- Includes DomDetailer data in batch upsert

## API Reference

### DomDetailerService

#### Constructor

```typescript
new DomDetailerService()
```

The service is initialized with default configuration. Use the `configure()` method to customize settings.

**Default Configuration:**
```typescript
{
  baseUrl: 'https://domdetailer.com/api/'
  app: 'rankwell'
  apiKey: '5MJUXJ1XZVIP9'
  majesticChoice: 'asis'
  timeout: 30000
}
```

#### Configuration

##### `configure(config: Partial<DomDetailerConfig>): void`

Configure the service with custom settings (optional).

```typescript
const domDetailer = new DomDetailerService();

// Customize configuration if needed
domDetailer.configure({
  app: 'my_app',
  apiKey: 'YOUR_API_KEY',
  timeout: 60000,
});
```

**Config Options:**
```typescript
{
  baseUrl?: string;        // API base URL
  app?: string;            // Application name
  apiKey?: string;         // API key
  majesticChoice?: string; // Majestic option
  timeout?: number;        // Request timeout (ms)
}
```

#### Methods

##### `checkDomain(url: string): Promise<DomDetailerResult>`

Check a single domain.

```typescript
const domDetailer = new DomDetailerService();
const result = await domDetailer.checkDomain('example.com');

if (result.success) {
  console.log(result.data);
}
```

##### `checkDomainsBatch(urls: string[], delayMs?: number): Promise<DomDetailerResult[]>`

Check multiple domains sequentially with delay.

```typescript
const results = await domDetailer.checkDomainsBatch(
  ['example.com', 'test.com'],
  500 // 500ms delay between requests
);
```

##### `checkDomainsBatchConcurrent(urls: string[], concurrency?: number, delayMs?: number): Promise<DomDetailerResult[]>`

Check multiple domains with concurrency control.

```typescript
const results = await domDetailer.checkDomainsBatchConcurrent(
  ['example.com', 'test.com', 'demo.com'],
  3,   // Max 3 concurrent requests
  500  // 500ms delay between requests
);
```

##### `getResultMap(results: DomDetailerResult[]): Map<string, DomDetailerResult>`

Convert results array to map for easy lookup.

```typescript
const results = await domDetailer.checkDomainsBatch(urls);
const resultMap = domDetailer.getResultMap(results);

const exampleResult = resultMap.get('example.com');
```

### Interfaces

#### DomDetailerResult

```typescript
interface DomDetailerResult {
  url: string;
  success: boolean;
  data?: DomDetailerData;  // API response if successful
  error?: string;          // Error message if failed
  checkedAt: string;       // ISO timestamp
}
```

#### DomDetailerData

```typescript
interface DomDetailerData {
  [key: string]: any;  // API response structure
}
```

#### ScrapedNetlinkData (Extended)

```typescript
interface ScrapedNetlinkData {
  url: string;
  netlinkId?: string | number;
  landingPage?: string;
  scrapedAt: string;
  success: boolean;
  error?: string;

  foundLink?: {
    href: string;
    text: string;
    outerHTML: string;
    matched: boolean;
    matchType?: 'exact' | 'domain' | 'subdomain' | 'partial';
    rel?: string;
    link_type?: 'dofollow' | 'nofollow';
  };

  domainFound?: boolean;
  domainFoundLink?: {...};
  allLinksCount?: number;

  // NEW: DomDetailer data
  domDetailer?: DomDetailerResult;
}
```

#### NetlinkAdditionalInfo (for Upsert)

```typescript
interface NetlinkAdditionalInfo {
  netlink_id: number;
  link_type: string;        // 'dofollow' | 'nofollow' | 'unknown'
  online_status: number;    // 1-4
  domDetailerData?: {       // NEW: Complete DomDetailer result
    url: string;
    success: boolean;
    checkedAt: string;
    data?: any;             // API response if successful
    error?: string;         // Error message if failed
  };
}
```

## Usage Examples

### Example 1: Basic Scraping with DomDetailer

```typescript
import { NetlinkScraperService } from './services/netlink-scraper.service';

const results = await scraperService.scrapeNetlinks(netlinks, {
  concurrency: 5,
  timeout: 30000,
  enableDomDetailer: true,
  domDetailerConcurrency: 3,
  enableLogging: true,
});

// Results include DomDetailer data
results.forEach(result => {
  console.log(`URL: ${result.url}`);
  console.log(`Link Type: ${result.foundLink?.link_type}`);

  if (result.domDetailer?.success) {
    console.log('DomDetailer Data:', result.domDetailer.data);
  }
});
```

### Example 2: Scrape by Contract ID

```typescript
const stats = await scraperService.scrapeByContractId(123, {
  concurrency: 5,
  enableDomDetailer: true,
  domDetailerConcurrency: 3,
  enableLogging: true,
});

console.log(`Total: ${stats.total}`);
console.log(`Successful: ${stats.successful}`);
```

### Example 3: Using DomDetailer Service Directly

```typescript
import { DomDetailerService } from '../common/domdetailer.service';

const domDetailer = new DomDetailerService();

// Single domain
const result = await domDetailer.checkDomain('example.com');

// Multiple domains (concurrent)
const results = await domDetailer.checkDomainsBatchConcurrent(
  ['example.com', 'test.com', 'demo.com'],
  3
);

// Get result map
const resultMap = domDetailer.getResultMap(results);
const exampleData = resultMap.get('example.com');
```

### Example 4: Custom Configuration

```typescript
const domDetailer = new DomDetailerService();

// Configure with custom settings
domDetailer.configure({
  app: 'my_app',
  apiKey: 'YOUR_API_KEY',
  timeout: 20000,
});

const result = await domDetailer.checkDomain('example.com');
```

## Configuration Options

### ScrapeOptions (Extended)

```typescript
interface ScrapeOptions {
  // Standard scraping options
  concurrency?: number;              // Default: 3
  timeout?: number;                  // Default: 30000
  retries?: number;                  // Default: 3
  delay?: number;                    // Default: 1000
  skipErrors?: boolean;              // Default: true
  enableLogging?: boolean;           // Default: false
  logFilePath?: string;

  // DomDetailer options
  enableDomDetailer?: boolean;       // Default: false
  domDetailerConcurrency?: number;   // Default: 3

  // Callbacks
  onProgress?: (current: number, total: number, url: string) => void;
  onSuccess?: (data: ScrapedNetlinkData) => void | Promise<void>;
  onError?: (url: string, error: Error) => void | Promise<void>;
}
```

## Testing

### Run Integration Test

```bash
# Test the full integration
npm run test:domdetailer
```

### Run Examples

```bash
# Run all examples
npm run example:domdetailer

# Run specific example (1-7)
npm run example:domdetailer 1
npm run example:domdetailer 4
```

### Expected Test Output

```
===============================================================================
TESTING DOMDETAILER INTEGRATION WITH NETLINK SCRAPER
===============================================================================

[1/5] Fetching sample netlinks...
✓ Fetched 3 netlinks for testing

[2/5] Scraping netlinks WITH DomDetailer integration...

  Progress: 1/3 - Scraping https://example.com...
  Progress: 2/3 - Scraping https://example2.com...
  Progress: 3/3 - Scraping https://example3.com...

[3/5] Scraping complete!
Duration: 45.23s

[4/5] Results Summary:
--------------------------------------------------------------------------------

1. https://example.com
   Netlink ID: 123
   Scrape Status: ✓ Success
   Link Found: ✓ Yes
   Link Type: dofollow
   DomDetailer Check: ✓ Success
   DomDetailer Data: Available

[5/5] Testing batch upsert with DomDetailer data...
✓ Batch upsert successful!
```

## Batch Upsert Payload

Example payload sent to `/netlink/additionalInfo/upsert`:

```json
{
  "items": [
    {
      "netlink_id": 123,
      "link_type": "dofollow",
      "online_status": 1,
      "domDetailerData": {
        "url": "https://example.com",
        "success": true,
        "checkedAt": "2025-01-13T10:30:45.123Z",
        "data": {
          "domain": "example.com",
          "status": "active",
          "majestic_data": {...},
          "metrics": {...}
        }
      }
    },
    {
      "netlink_id": 124,
      "link_type": "nofollow",
      "online_status": 1,
      "domDetailerData": {
        "url": "https://example2.com",
        "success": false,
        "checkedAt": "2025-01-13T10:30:46.123Z",
        "error": "Connection timeout"
      }
    }
  ]
}
```

## Performance

### Timing Comparison

- **Without DomDetailer**: ~1-2 seconds per URL
- **With DomDetailer**: ~3-5 seconds per URL

### Recommended Settings

```typescript
{
  concurrency: 5,           // Scraping concurrency (can be higher)
  domDetailerConcurrency: 3 // DomDetailer concurrency (keep at 2-3)
}
```

**Why?**
- Scraping is local (Lightpanda browser) → can handle more concurrency
- DomDetailer is external API → needs rate limiting

### Rate Limiting

Built-in 500ms delay between DomDetailer requests to avoid rate limiting.

## Error Handling

### Graceful Failures

If DomDetailer fails for a URL:
- ✅ Scraping result is still valid
- ✅ `domDetailer.success = false`
- ✅ `domDetailer.error` contains error message
- ✅ Item still included in batch upsert (without domdetailer_data)

### Example Error Result

```typescript
{
  url: "https://example.com",
  success: true,  // Scraping succeeded
  foundLink: { matched: true, link_type: "dofollow" },
  domDetailer: {
    url: "https://example.com",
    success: false,  // DomDetailer failed
    error: "API error: 429 - Rate limit exceeded",
    checkedAt: "2025-01-13T10:30:45.123Z"
  }
}
```

## Logging

When `enableLogging: true`, DomDetailer checks are logged:

```
[2025-01-13T10:30:45.123Z] Starting DomDetailer checks for 3 URLs
[2025-01-13T10:30:46.456Z] DomDetailer check for https://example.com: SUCCESS
[2025-01-13T10:30:46.457Z]   Data: {"domain":"example.com",...}
[2025-01-13T10:30:47.789Z] DomDetailer check for https://example2.com: FAILED
[2025-01-13T10:30:47.790Z]   Error: Connection timeout
[2025-01-13T10:30:48.123Z] DomDetailer checks complete: 2/3 successful
```

## File Structure

```
src/
├── common/
│   ├── domdetailer.service.ts        # DomDetailer service
│   ├── lightpanda.service.ts
│   └── dashboard-http-client.service.ts
├── modules/
│   └── paperclub/
│       ├── services/
│       │   ├── netlink-scraper.service.ts  # Updated with DomDetailer
│       │   └── netlink.service.ts
│       └── paperclub.module.ts       # Provides DomDetailerService
├── cli/
│   └── test-domdetailer-integration.ts  # Integration test
└── examples/
    └── domdetailer-example.ts        # Usage examples
```

## Files Modified

### Modified Files
- `src/common/domdetailer.service.ts` - Created (TypeScript service)
- `src/modules/paperclub/services/netlink-scraper.service.ts` - Updated
- `src/modules/paperclub/paperclub.module.ts` - Added provider
- `src/cli/test-domdetailer-integration.ts` - Updated
- `src/examples/domdetailer-example.ts` - Created
- `package.json` - Added scripts

### Removed Files
- ❌ All Python files removed (domdetailer.py, requirements.txt, etc.)

## Troubleshooting

### DomDetailer API Errors

**Problem**: API returns 429 (rate limit)
**Solution**: Increase delay or reduce concurrency

```typescript
{
  enableDomDetailer: true,
  domDetailerConcurrency: 2,  // Reduce from 3 to 2
}
```

**Problem**: Timeout errors
**Solution**: Increase timeout in service config

```typescript
const domDetailer = new DomDetailerService();
domDetailer.configure({
  timeout: 60000,  // Increase to 60 seconds
});
```

### Slow Performance

**Problem**: Scraping takes too long
**Solution**: Disable DomDetailer or reduce concurrency

```typescript
{
  enableDomDetailer: false,  // Disable for faster scraping
}
```

### TypeScript Compilation Errors

**Problem**: Import errors
**Solution**: Rebuild the project

```bash
npm run build
```

## Backend Requirements

Your backend endpoint `/netlink/additionalInfo/upsert` must accept:

```typescript
{
  items: Array<{
    netlink_id: number;
    link_type: string;
    online_status: number;
    domDetailerData?: {      // Optional field
      url: string;
      success: boolean;
      checkedAt: string;
      data?: any;            // API response (if successful)
      error?: string;        // Error message (if failed)
    };
  }>
}
```

## Next Steps

1. ✅ Test the integration: `npm run test:domdetailer`
2. ✅ Run examples: `npm run example:domdetailer`
3. ⬜ Verify backend can handle `domdetailer_data` field
4. ⬜ Update database schema if needed
5. ⬜ Enable in production with `enableDomDetailer: true`

## Support & Documentation

- **Integration Test**: `npm run test:domdetailer`
- **Examples**: `npm run example:domdetailer`
- **Logs**: Check `logs/` directory for detailed output
- **API Docs**: https://domdetailer.com/

## Summary

The DomDetailer service is now fully integrated in TypeScript:
- ✅ No Python dependencies
- ✅ Seamless NestJS integration
- ✅ Auto-enrichment of scraping results
- ✅ Configurable and production-ready
