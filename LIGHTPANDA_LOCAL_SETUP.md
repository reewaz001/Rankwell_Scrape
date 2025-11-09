# Lightpanda Local Browser Setup

## Overview

The scraper now uses **Lightpanda local browser** instead of Lightpanda cloud. This provides:

✅ No cloud dependency
✅ True concurrent scraping (multiple contexts)
✅ Better performance and reliability
✅ No authentication tokens needed

## Prerequisites

### Platform Requirements

Lightpanda can be installed on:
- **Linux** (x86_64)
- **macOS** (Apple Silicon)
- **Windows** (via WSL - Windows Subsystem for Linux)

## Installation

The `@lightpanda/browser` package is already installed in this project:

```json
"@lightpanda/browser": "^1.0.1"
```

No additional installation is needed - the package will automatically download and manage the Lightpanda binary.

## Configuration

### Environment Variables

Add these optional variables to your `.env` file:

```env
# Lightpanda Local Browser Configuration
LIGHTPANDA_HOST=127.0.0.1
LIGHTPANDA_PORT=9222
```

**Note:** These are optional. If not specified, the default values above will be used.

### Remove Old Cloud Token

If you have the old cloud token in your `.env` file, you can remove it:

```env
# Remove this (no longer needed)
# LPD_TOKEN=...
```

## How It Works

### Architecture

1. **Lightpanda Server** - Starts as a local process with CDP (Chrome DevTools Protocol) server
2. **Playwright Connection** - Connects to the local server via WebSocket
3. **Multiple Contexts** - Creates isolated browser contexts for concurrent scraping

### Code Flow

```typescript
// 1. Start Lightpanda local server
const proc = await lightpanda.serve({ host: '127.0.0.1', port: 9222 });

// 2. Connect Playwright to local server
const browser = await chromium.connectOverCDP('ws://127.0.0.1:9222');

// 3. Create contexts and pages
const context = await browser.newContext();
const page = await context.newPage();

// 4. Scrape websites
await page.goto('https://example.com');

// 5. Cleanup
await page.close();
await context.close();
await browser.close();
proc.kill();
```

## Concurrent Scraping

### Before (Cloud Version)
- ❌ Only 1 context at a time
- ❌ Operations serialized (one by one)
- ❌ "Browser has been closed" errors
- ❌ Slower performance

### After (Local Version)
- ✅ Multiple contexts simultaneously
- ✅ True concurrent scraping
- ✅ No context conflicts
- ✅ Much faster performance

### Example

```typescript
// Scrape 10 URLs concurrently with 3 workers
await scraperService.scrapeNetlinks(netlinks, {
  concurrency: 3,  // 3 concurrent browser contexts
  timeout: 30000,
  retries: 2,
});
```

## Usage

### Test Single Scrape

```bash
npm run test:netlink-scraper
```

Expected output:
```
[LOG] Starting Lightpanda local server...
[LOG] Lightpanda server started on 127.0.0.1:9222
[LOG] Connecting Playwright to ws://127.0.0.1:9222...
[LOG] Browser connected successfully
[LOG] Starting to scrape 3 netlinks with concurrency 1
✓ Test complete: 3/3 successful
```

### Test Batch Scraping

```bash
npm run test:netlink-scraper batch
```

This will:
1. Start Lightpanda server
2. Fetch netlinks from API in batches
3. Scrape each batch with concurrency
4. Post results to `/netlink/additionalInfo/upsert`
5. Stop Lightpanda server

## Performance

### Concurrency Settings

Recommended concurrency settings based on your machine:

| Machine Type | Recommended Concurrency |
|--------------|------------------------|
| Low-end (4GB RAM) | 2-3 |
| Mid-range (8GB RAM) | 3-5 |
| High-end (16GB+ RAM) | 5-10 |

### Memory Usage

Each browser context uses approximately 50-100MB of memory. Monitor your system resources and adjust concurrency accordingly.

## Troubleshooting

### Issue: "Failed to start Lightpanda browser"

**Solution:**
- On Windows: Make sure you're running in WSL
- On Linux/Mac: Ensure you have proper permissions
- Check if port 9222 is available

### Issue: "Connection refused"

**Solution:**
- Wait a few seconds for server to start
- Check firewall settings
- Try a different port (update LIGHTPANDA_PORT)

### Issue: Slow scraping

**Solution:**
- Increase concurrency setting
- Reduce timeout values
- Check your internet connection

## Advantages over Cloud Version

| Feature | Cloud Version | Local Version |
|---------|---------------|---------------|
| **Dependency** | Requires cloud service | Fully local |
| **Authentication** | Needs token | None required |
| **Concurrency** | 1 context only | Multiple contexts |
| **Performance** | Network latency | Direct local access |
| **Reliability** | Cloud outages | Always available |
| **Cost** | Potential costs | Free |
| **Privacy** | Data sent to cloud | All data local |

## Migration Notes

### What Changed

1. ✅ Removed `LPD_TOKEN` environment variable
2. ✅ Added `LIGHTPANDA_HOST` and `LIGHTPANDA_PORT` (optional)
3. ✅ Removed mutex locks (no longer needed)
4. ✅ Enabled true concurrent scraping
5. ✅ Simplified service code

### What Stayed the Same

- ✅ All scraping logic unchanged
- ✅ Same API endpoints
- ✅ Same batch upsert functionality
- ✅ Same data format
- ✅ Same test commands

## Testing

### Quick Test (3 netlinks)

```bash
npm run test:netlink-scraper
```

### Batch Test (all netlinks)

```bash
npm run test:netlink-scraper batch
```

### Test with Custom Concurrency

Edit `src/cli/test-netlink-scraper.ts` and change:

```typescript
{
  concurrency: 5,  // Change this value
  timeout: 30000,
  retries: 2,
}
```

## Support

For Lightpanda documentation and support:
- 📚 Documentation: https://lightpanda.io/docs
- 🐙 GitHub: https://github.com/lightpanda-io/browser
- 💬 Issues: https://github.com/lightpanda-io/browser/issues

## Summary

The migration to local Lightpanda browser provides:
- 🚀 Better performance
- 🔒 More privacy
- 💪 True concurrency
- 🎯 Higher reliability
- 💰 No cloud costs

All tests should now work faster and more reliably!
