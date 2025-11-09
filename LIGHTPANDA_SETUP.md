# Lightpanda Cloud Browser Integration

This project includes a reusable Lightpanda cloud browser service for web scraping and automation.

## Overview

Lightpanda is a fast, lightweight headless browser designed specifically for web scraping and automation. The `LightpandaService` connects to Lightpanda's cloud service via CDP (Chrome DevTools Protocol), eliminating the need for local browser binaries.

## Files Created

- `src/common/lightpanda.service.ts` - Reusable Lightpanda cloud service
- `src/cli/test-lightpanda.ts` - Test script to verify connection
- `src/examples/lightpanda-example.ts` - Usage examples

## Platform Support

### ✅ Cloud-Based Solution

**This service uses Lightpanda Cloud**, which means:
- ✅ Works on **all platforms** (Windows, Mac, Linux)
- ✅ No local browser binary installation required
- ✅ Browsers run in Lightpanda's cloud infrastructure
- ✅ Only requires an API token to connect

### Requirements

- Node.js environment
- `LPD_TOKEN` environment variable with your Lightpanda API token
- Internet connection to reach `euwest.cloud.lightpanda.io`

## Installation

1. **Install npm packages** (already done):
   ```bash
   npm install --save playwright-core @lightpanda/browser
   ```

2. **Configure environment variables**:

   Add your Lightpanda token to your `.env` file:
   ```bash
   # Lightpanda Cloud Configuration
   LPD_TOKEN=your-actual-lightpanda-token-here
   ```

   See `.env.example` for the full configuration template.

## Usage

### Basic Usage

```typescript
import { LightpandaService } from './common/lightpanda.service';

// In a NestJS service
constructor(private readonly lightpanda: LightpandaService) {}

async myScrapingMethod() {
  // Get browser instance
  const browser = await this.lightpanda.getBrowser();

  // Create a new page
  const page = await this.lightpanda.createPage();

  // Navigate and scrape
  await page.goto('https://example.com');
  const title = await page.title();

  // Cleanup
  await page.close();
}
```

### Using the Helper Method

```typescript
// Automatically handles page creation and cleanup
const result = await this.lightpanda.withPage(async (page) => {
  await page.goto('https://example.com');
  const title = await page.title();
  return title;
});
```

### Navigate with Options

```typescript
const { page, context } = await this.lightpanda.navigateToPage(
  'https://example.com',
  {
    waitUntil: 'networkidle',
    timeout: 30000
  }
);
```

## Testing

Run the test script to verify your cloud connection:

```bash
npm run test:lightpanda
```

This will:
- Connect to Lightpanda cloud
- Navigate to example.com and Hacker News
- Extract content to verify functionality
- Display connection status

## Examples

See `src/examples/lightpanda-example.ts` for complete working examples including:
- Scraping Hacker News stories
- Manual page management
- Custom browser contexts
- Usage within NestJS services

Run the example:
```bash
ts-node src/examples/lightpanda-example.ts
```

## Service Features

- ✅ Singleton browser instance management
- ✅ Automatic cleanup on module destroy
- ✅ Browser context and page creation utilities
- ✅ Connection to Lightpanda server via Playwright
- ✅ Helper methods for common scraping tasks

## Integration with PaperClub Module

The `LightpandaService` has been added to the `PaperClubModule` and is available for injection:

```typescript
// src/modules/paperclub/paperclub.module.ts
providers: [
  // ... other services
  LightpandaService,
],
exports: [
  // ... other exports
  LightpandaService,
],
```

You can now inject it into any service within the module to perform browser-based scraping.

## Resources

- [Lightpanda Documentation](https://lightpanda.io/docs)
- [Playwright Documentation](https://playwright.dev)
- [GitHub Repository](https://github.com/lightpanda-io/browser)
