# Lightpanda Quick Start Guide

## ✅ Setup Complete!

Your Lightpanda cloud browser integration is ready to use.

## Quick Test

```bash
# Test the connection
npm run test:lightpanda

# Run the Hacker News scraping example
npm run example:lightpanda
```

## Basic Usage

### 1. Simple Scraping (Recommended)

```typescript
import { LightpandaService } from './common/lightpanda.service';

constructor(private readonly lightpanda: LightpandaService) {}

async scrape() {
  const data = await this.lightpanda.withPage(async (page) => {
    await page.goto('https://example.com');
    const title = await page.title();
    const content = await page.locator('h1').textContent();

    return { title, content };
  });

  return data;
}
```

### 2. Manual Page Management

```typescript
async scrapeManual() {
  // Create context and page
  const context = await this.lightpanda.createContext();
  const page = await context.newPage();

  try {
    await page.goto('https://example.com');
    const data = await page.evaluate(() => {
      return {
        title: document.title,
        links: Array.from(document.querySelectorAll('a'))
          .map(a => a.href)
      };
    });

    return data;
  } finally {
    await page.close();
    await context.close();
  }
}
```

### 3. Navigation Helper

```typescript
async quickScrape(url: string) {
  const { page, context } = await this.lightpanda.navigateToPage(url, {
    waitUntil: 'domcontentloaded',
    timeout: 10000
  });

  try {
    const data = await page.content();
    return data;
  } finally {
    await page.close();
    await context.close();
  }
}
```

## Important Notes

### Cloud Limitation
- Lightpanda cloud only supports **one browser context at a time**
- The service automatically closes old contexts when creating new ones
- Use `withPage()` for automatic cleanup

### Best Practices

1. **Always cleanup**: Close pages and contexts when done
2. **Use withPage()**: Automatic cleanup is safer
3. **Handle timeouts**: Set reasonable timeout values
4. **Error handling**: Wrap in try-catch blocks

### Example Patterns

**Pattern 1: Scrape multiple URLs sequentially**
```typescript
async scrapeMultiple(urls: string[]) {
  const results = [];

  for (const url of urls) {
    const data = await this.lightpanda.withPage(async (page) => {
      await page.goto(url);
      return await page.title();
    });
    results.push({ url, data });
  }

  return results;
}
```

**Pattern 2: Extract structured data**
```typescript
async scrapeProducts(url: string) {
  return await this.lightpanda.withPage(async (page) => {
    await page.goto(url);
    await page.waitForSelector('.product');

    const products = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.product')).map(p => ({
        name: p.querySelector('.name')?.textContent,
        price: p.querySelector('.price')?.textContent,
        image: p.querySelector('img')?.src
      }));
    });

    return products;
  });
}
```

**Pattern 3: Interact with forms**
```typescript
async searchAndExtract(query: string) {
  return await this.lightpanda.withPage(async (page) => {
    await page.goto('https://example.com/search');

    // Fill search form
    await page.locator('input[name="q"]').fill(query);
    await page.keyboard.press('Enter');

    // Wait for results
    await page.waitForSelector('.results', { timeout: 5000 });

    // Extract results
    const results = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.result')).map(r => ({
        title: r.querySelector('h3')?.textContent,
        link: r.querySelector('a')?.href
      }));
    });

    return results;
  });
}
```

## Troubleshooting

### Connection fails
- Check your `LPD_TOKEN` in `.env`
- Verify internet connection
- Token may have expired

### "Cannot have more than one browser context"
- This is normal - the service handles it automatically
- Use `withPage()` to avoid manual context management

### Page timeout
- Increase timeout: `{ timeout: 30000 }`
- Use faster waitUntil: `{ waitUntil: 'domcontentloaded' }`

## Files Reference

- **Service**: `src/common/lightpanda.service.ts`
- **Test**: `src/cli/test-lightpanda.ts`
- **Examples**: `src/examples/lightpanda-example.ts`
- **Full Docs**: `LIGHTPANDA_SETUP.md`

## Next Steps

1. Integrate into your scraper services
2. Replace API calls with browser automation where needed
3. Handle JavaScript-heavy sites
4. Extract dynamic content

For more details, see `LIGHTPANDA_SETUP.md`
