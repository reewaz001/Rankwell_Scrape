# DomDetailer Integration - Quick Start

## TL;DR

Your netlink scraper now automatically checks DomDetailer for each URL and includes the data in the batch upsert.

## Enable It

```typescript
const results = await scraperService.scrapeNetlinks(netlinks, {
  enableDomDetailer: true, // 👈 Just add this!
  domDetailerConcurrency: 3,
});
```

## Test It

```bash
npm run test:domdetailer
```

## What You Get

### Before
```json
{
  "netlink_id": 123,
  "link_type": "dofollow",
  "online_status": 1
}
```

### After
```json
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
      "majestic_data": {...},
      "metrics": {...}
    }
  }
}
```

## Examples

### Example 1: Scrape with DomDetailer

```typescript
const results = await scraperService.scrapeNetlinks(netlinks, {
  concurrency: 5,
  enableDomDetailer: true,
  domDetailerConcurrency: 3,
});
```

### Example 2: Scrape by Contract

```typescript
const stats = await scraperService.scrapeByContractId(123, {
  enableDomDetailer: true,
  enableLogging: true,
});
```

### Example 3: Use Service Directly

```typescript
import { DomDetailerService } from './common/domdetailer.service';

const domDetailer = new DomDetailerService();
const result = await domDetailer.checkDomain('example.com');
```

## Run Examples

```bash
# Run all examples
npm run example:domdetailer

# Run specific example
npm run example:domdetailer 1
```

## Configuration

```typescript
{
  enableDomDetailer: true,       // Enable/disable
  domDetailerConcurrency: 3,     // Max concurrent checks
  enableLogging: true,           // Log results
}
```

## Performance

- **Without DomDetailer**: ~1-2 sec/URL
- **With DomDetailer**: ~3-5 sec/URL

**Recommended Settings:**
```typescript
{
  concurrency: 5,           // Scraping
  domDetailerConcurrency: 3 // DomDetailer (keep low)
}
```

## Common Commands

```bash
# Test integration
npm run test:domdetailer

# Run examples
npm run example:domdetailer

# Build project
npm run build
```

## Full Documentation

See `DOMDETAILER_README.md` for complete guide.

## Quick Test

```bash
# Test it now
npm run test:domdetailer
```

✅ Pure TypeScript - No Python needed!
