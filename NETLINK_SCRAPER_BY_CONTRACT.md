# Netlink Scraper by Contract ID

This guide explains how to scrape netlinks filtered by contract_id with detailed logging.

## Features

✅ **Filter by Contract ID** - Scrape only netlinks for a specific contract
✅ **Detailed Logging** - Every netlink is logged with comprehensive details
✅ **Progress Tracking** - Real-time progress updates during scraping
✅ **JSON Export** - Results saved to structured JSON file
✅ **API Integration** - Automatic posting to batch upsert endpoint
✅ **Error Reporting** - Detailed error logs for failed scrapes

## Quick Start

### Basic Usage

```bash
npm run test:netlink-scraper:contract <contract_id>
```

### Example

```bash
npm run test:netlink-scraper:contract 123
```

## What Gets Logged?

For **every netlink**, the log file contains:

- **Netlink ID** - The unique identifier
- **Contract ID** - The contract this netlink belongs to
- **URL** - The URL being scraped (url_bought)
- **Landing Page** - The expected landing page URL
- **Status** - Whether scraping succeeded or failed
- **Links Found** - Total number of links found on the page
- **Match Status** - Whether the landing page link was found
- **Match Type** - Type of match (exact, domain, subdomain)
- **Link Type** - dofollow or nofollow
- **Link Details**:
  - href (the actual link URL)
  - text (the link text)
  - rel attribute (if any)
- **Timestamp** - When this netlink was scraped
- **Error Message** - If scraping failed, why it failed

## Output Files

### 1. Log File
**Location**: `logs/contract-<id>-<timestamp>.log`

**Example**: `logs/contract-123-2025-11-12T10-30-45-123Z.log`

**Format**:
```
[2025-11-12T10:30:45.123Z] ================================================================================
[2025-11-12T10:30:45.123Z] NETLINK SCRAPER LOG - 2025-11-12T10:30:45.123Z
[2025-11-12T10:30:45.123Z] ================================================================================
[2025-11-12T10:30:45.124Z] Filtering netlinks for contract_id: 123
[2025-11-12T10:30:45.125Z] Starting to scrape 15 netlinks with concurrency 3

[2025-11-12T10:30:46.200Z] --------------------------------------------------------------------------------
[2025-11-12T10:30:46.201Z] NETLINK ID: 456
[2025-11-12T10:30:46.201Z] CONTRACT ID: 123
[2025-11-12T10:30:46.201Z] URL: https://example.com/blog/post
[2025-11-12T10:30:46.201Z] LANDING PAGE: https://mysite.com
[2025-11-12T10:30:46.201Z] STATUS: SUCCESS
[2025-11-12T10:30:46.201Z] ALL LINKS FOUND: 42
[2025-11-12T10:30:46.201Z] LINK MATCHED: true
[2025-11-12T10:30:46.201Z] MATCH TYPE: exact
[2025-11-12T10:30:46.201Z] LINK TYPE: dofollow
[2025-11-12T10:30:46.201Z] LINK HREF: https://mysite.com
[2025-11-12T10:30:46.201Z] LINK TEXT: Visit My Site
[2025-11-12T10:30:46.201Z] LINK REL: none
[2025-11-12T10:30:46.201Z] SCRAPED AT: 2025-11-12T10:30:46.201Z
[2025-11-12T10:30:46.201Z] --------------------------------------------------------------------------------
```

### 2. JSON Results File
**Location**: `scraped-data/contract-<id>-results-<timestamp>.json`

**Example**: `scraped-data/contract-123-results-2025-11-12T10-30-45-123Z.json`

**Format**:
```json
[
  {
    "url": "https://example.com/blog/post",
    "netlinkId": 456,
    "landingPage": "https://mysite.com",
    "scrapedAt": "2025-11-12T10:30:46.201Z",
    "success": true,
    "foundLink": {
      "href": "https://mysite.com",
      "text": "Visit My Site",
      "outerHTML": "<a href=\"https://mysite.com\" class=\"link\">Visit My Site</a>",
      "matched": true,
      "matchType": "exact",
      "rel": "",
      "link_type": "dofollow"
    },
    "allLinksCount": 42
  },
  {
    "url": "https://example2.com/article",
    "netlinkId": 457,
    "landingPage": "https://mysite.com",
    "scrapedAt": "2025-11-12T10:30:47.301Z",
    "success": false,
    "error": "Navigation timeout of 30000 ms exceeded"
  }
]
```

## Understanding the Results

### Success Cases

When a netlink is successfully scraped:

1. **Link Found & Matched** (`matched: true`)
   - The landing page link was found on the page
   - `link_type` shows "dofollow" or "nofollow"
   - `matchType` shows how it matched (exact, domain, subdomain)
   - API will receive `online_status: 1`

2. **Link Not Matched** (`matched: false`)
   - Page loaded successfully but landing page link not found
   - Could mean the link was removed
   - API will receive `online_status: 2`

### Failure Cases

When scraping fails:

- `success: false`
- `error` field contains the reason
- Common errors:
  - Navigation timeout (site too slow/down)
  - DNS errors (domain doesn't exist)
  - Connection refused (site offline)
- API will receive `online_status: 3`

## Advanced Configuration

You can customize the scraping behavior by modifying the options in `test-netlink-scraper-by-contract.ts`:

```typescript
const stats = await scraperService.scrapeByContractId(contractId, {
  concurrency: 3,        // Number of concurrent scrapes (1-5 recommended)
  timeout: 30000,        // Timeout per page in ms (30 seconds)
  retries: 2,            // Number of retries for failed scrapes
  delay: 500,            // Delay between requests in ms
  enableLogging: true,   // Enable file logging
  logFilePath: logPath,  // Custom log file path (optional)

  // Callbacks
  onProgress: (current, total, url) => {
    // Called for each netlink being processed
  },
  onSuccess: (data) => {
    // Called when a netlink is successfully scraped
  },
  onError: (url, error) => {
    // Called when a netlink fails to scrape
  },
});
```

## Programmatic Usage

You can also use the service directly in your code:

```typescript
import { NetlinkScraperService } from './modules/paperclub/services/netlink-scraper.service';

// Scrape by contract ID
const stats = await scraperService.scrapeByContractId(123, {
  concurrency: 3,
  timeout: 30000,
  enableLogging: true,
});

console.log(`Scraped ${stats.successful}/${stats.total} netlinks`);
```

## API Integration

After scraping, results are automatically posted to:

**Endpoint**: `POST /netlink/additionalInfo/upsert`

**Payload**:
```json
{
  "items": [
    {
      "netlink_id": 456,
      "link_type": "dofollow",
      "online_status": 1
    }
  ]
}
```

**Status Codes**:
- `1` - Link found & accessible (success with matched link)
- `2` - No matching link found (success but link not found)
- `3` - Site not accessible/offline (scraping failed)

## Troubleshooting

### No netlinks found for contract_id

**Problem**: "Found 0 netlinks for contract_id 123"

**Solution**:
- Verify the contract_id exists in the database
- Check if the contract has any netlinks associated
- Ensure the API is returning data correctly

### High failure rate

**Problem**: Many netlinks failing to scrape

**Solution**:
- Increase timeout: `timeout: 60000` (60 seconds)
- Reduce concurrency: `concurrency: 1`
- Check if sites are actually down
- Review error messages in log file

### Log file not created

**Problem**: No log file appears in `logs/` directory

**Solution**:
- Ensure `enableLogging: true` is set
- Check file system permissions
- Look for error messages in console

## Performance Tips

1. **Optimal Concurrency**: Start with 3, adjust based on results
   - Too high = timeouts and failures
   - Too low = slow scraping

2. **Timeout Settings**: Balance between patience and speed
   - 30 seconds = good default
   - 60 seconds = for slow sites
   - 15 seconds = for fast sites only

3. **Delay Between Requests**: Prevents rate limiting
   - 500ms = good default
   - 1000ms = more polite
   - 0ms = maximum speed (risky)

## Examples

### Example 1: Scrape contract 123
```bash
npm run test:netlink-scraper:contract 123
```

### Example 2: View help
```bash
npm run test:netlink-scraper:contract help
```

### Example 3: Process results from log file
```bash
# View the log file
cat logs/contract-123-2025-11-12T10-30-45-123Z.log

# Search for failed netlinks
grep "STATUS: FAILED" logs/contract-123-*.log

# Count successful matches
grep "LINK MATCHED: true" logs/contract-123-*.log | wc -l
```

## Next Steps

1. Run the scraper for your contract ID
2. Review the log file for detailed information
3. Check the JSON file for structured data
4. Verify the API received the updates
5. Investigate any failed netlinks

## Support

For issues or questions:
- Check the log files for detailed error messages
- Review the NETLINK_SCRAPING_GUIDE.md for general scraping info
- Examine the service code in `src/modules/paperclub/services/netlink-scraper.service.ts`
