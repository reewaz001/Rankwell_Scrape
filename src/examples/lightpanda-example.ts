import { LightpandaService } from '../common/lightpanda.service';
import { ConfigService } from '@nestjs/config';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Example: Using Lightpanda to scrape Hacker News
 *
 * This example demonstrates how to:
 * 1. Connect to Lightpanda cloud browser
 * 2. Navigate to a page
 * 3. Extract data using selectors
 * 4. Handle multiple pages
 */
async function hackerNewsExample() {
  console.log('Hacker News Scraping Example\n');

  const configService = new ConfigService();
  const lightpanda = new LightpandaService(configService);

  try {
    // Using the withPage helper - automatically handles cleanup
    const stories = await lightpanda.withPage(async (page) => {
      // Navigate to Hacker News
      await page.goto('https://news.ycombinator.com/');

      // Wait for content to load
      await page.waitForSelector('.titleline', { timeout: 5000 });

      // Extract story data
      const storyData = await page.evaluate(() => {
        const stories = Array.from(document.querySelectorAll('.athing'));
        return stories.slice(0, 10).map((story) => {
          const titleElement = story.querySelector('.titleline > a');
          const scoreElement = story.nextElementSibling?.querySelector('.score');

          return {
            title: titleElement?.textContent || '',
            url: titleElement?.getAttribute('href') || '',
            score: scoreElement?.textContent || 'N/A',
          };
        });
      });

      return storyData;
    });

    console.log('Top 10 Hacker News Stories:\n');
    stories.forEach((story, index) => {
      console.log(`${index + 1}. ${story.title}`);
      console.log(`   URL: ${story.url}`);
      console.log(`   Score: ${story.score}\n`);
    });

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await lightpanda.stopBrowser();
  }
}

/**
 * Example: Manual page management for complex workflows
 */
async function manualPageExample() {
  console.log('\nManual Page Management Example\n');

  const configService = new ConfigService();
  const lightpanda = new LightpandaService(configService);

  try {
    // Get browser instance
    const browser = await lightpanda.getBrowser();
    console.log(`Connected to browser version: ${browser.version()}`);

    // Create a context with custom options
    const context = await lightpanda.createContext({
      userAgent: 'Mozilla/5.0 Custom Bot',
      viewport: { width: 1920, height: 1080 },
    });

    // Create a page
    const page = await context.newPage();

    // Navigate and interact
    await page.goto('https://example.com');
    const title = await page.title();
    console.log(`Page title: ${title}`);

    // Take a screenshot (if needed)
    // await page.screenshot({ path: 'example.png' });

    // Clean up
    await page.close();
    await context.close();

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await lightpanda.stopBrowser();
  }
}

/**
 * Example: Using in a NestJS service
 *
 * This shows the typical pattern for using Lightpanda
 * within a NestJS service where it's injected via DI
 */
class MyScraperService {
  constructor(private readonly lightpanda: LightpandaService) {}

  async scrapeProductData(url: string) {
    return await this.lightpanda.withPage(async (page) => {
      await page.goto(url);

      // Wait for product data to load
      await page.waitForSelector('.product-title');

      // Extract product information
      const productData = await page.evaluate(() => {
        return {
          title: document.querySelector('.product-title')?.textContent,
          price: document.querySelector('.product-price')?.textContent,
          description: document.querySelector('.product-description')?.textContent,
        };
      });

      return productData;
    });
  }

  async scrapeMultipleProducts(urls: string[]) {
    const results = [];

    for (const url of urls) {
      try {
        const data = await this.scrapeProductData(url);
        results.push({ url, data, success: true });
      } catch (error) {
        results.push({ url, error: error.message, success: false });
      }
    }

    return results;
  }
}

// Run examples
if (require.main === module) {
  (async () => {
    try {
      await hackerNewsExample();
      // await manualPageExample();
    } catch (error) {
      console.error('Fatal error:', error);
      process.exit(1);
    }
  })();
}

export { hackerNewsExample, manualPageExample, MyScraperService };
