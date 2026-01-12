#!/usr/bin/env node

/**
 * CLI Script for RocketLinks Scraping
 *
 * Usage:
 *   npm run scrape:rocketlinks                        # Scrape single category (default: sw_adult)
 *   npm run scrape:rocketlinks -- --all               # Scrape ALL categories
 *   npm run scrape:rocketlinks -- --login             # Just test login
 *   npm run scrape:rocketlinks -- --category sw_adult # Scrape specific category
 *   npm run scrape:rocketlinks -- --no-api            # Don't send to database
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { RocketLinksScraperService } from '../modules/rocketlinks/services/rocketlinks-scraper.service';
import { LightpandaService } from '../common/lightpanda.service';

async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('RANKWELL ROCKETLINKS SCRAPER');
  console.log('='.repeat(60) + '\n');

  // Parse command line arguments
  const args = process.argv.slice(2);

  // Get category from args (--category sw_adult)
  const categoryIndex = args.indexOf('--category');
  const category = categoryIndex !== -1 && args[categoryIndex + 1]
    ? args[categoryIndex + 1]
    : 'sw_adult'; // Default to sw_adult for testing

  const options = {
    loginOnly: args.includes('--login'),
    scrapeAll: args.includes('--all'),
    sendToAPI: !args.includes('--no-api'),
    category,
  };

  console.log('Options:');
  console.log(`  - Login only: ${options.loginOnly}`);
  console.log(`  - Scrape all categories: ${options.scrapeAll}`);
  console.log(`  - Category: ${options.scrapeAll ? 'ALL' : options.category}`);
  console.log(`  - Send to API: ${options.sendToAPI}`);
  console.log('');

  try {
    // Create NestJS application context
    const app = await NestFactory.createApplicationContext(AppModule, {
      logger: ['log', 'error', 'warn'],
    });

    // Get services
    const scraperService = app.get(RocketLinksScraperService);
    const browserService = app.get(LightpandaService);

    try {
      // Step 1: Login to RocketLinks
      console.log('Step 1: Logging in to RocketLinks...\n');
      await scraperService.login();

      if (options.loginOnly) {
        console.log('\n--login flag set, stopping after login.');
        console.log('Login successful! Browser session is ready for scraping.');

        // Wait a bit to see the result
        await new Promise(resolve => setTimeout(resolve, 5000));

        await scraperService.logout();
        await app.close();
        process.exit(0);
      }

      // Step 2: Scrape categories
      if (options.scrapeAll) {
        // Scrape ALL categories
        console.log(`\nStep 2: Scraping ALL categories...\n`);
        const result = await scraperService.scrapeAllCategories({
          delayBetweenPages: 2000,
          delayBetweenCategories: 5000,
          sendToAPI: options.sendToAPI,
        });

        console.log(`\nAll categories complete!`);
        console.log(`Total categories: ${result.totalCategories}`);
        console.log(`Total sites saved: ${result.totalSites}`);
      } else {
        // Scrape single category
        console.log(`\nStep 2: Scraping category: ${options.category}...\n`);
        const result = await scraperService.scrapeAllPagesForCategory(options.category, {
          delayBetweenPages: 2000,
          sendToAPI: options.sendToAPI,
        });

        console.log(`\nScraping complete!`);
        console.log(`Total pages: ${result.totalPages}`);
        console.log(`Total sites saved: ${result.totalSites}`);
      }

      // Cleanup
      await scraperService.logout();
      await app.close();

      console.log('\nScraping complete!');
      console.log('='.repeat(60) + '\n');

      process.exit(0);
    } catch (error) {
      console.error('\nError during scraping:');
      console.error(error.message);

      // Cleanup on error
      try {
        await scraperService.logout();
      } catch {}

      await app.close();
      process.exit(1);
    }
  } catch (error) {
    console.error('\nFailed to initialize application:');
    console.error(error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { main };
