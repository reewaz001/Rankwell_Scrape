#!/usr/bin/env node

/**
 * CLI Script for Paper.club Scraping
 *
 * Usage:
 *   npm run scrape                     # Scrape all categories
 *   npm run scrape -- --no-bqs        # Skip BQS scoring
 *   npm run scrape -- --no-save       # Don't save to file
 *   npm run scrape -- --no-db         # Don't send to database
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { PaperClubScraperService } from '../modules/paperclub/services/paperclub-scraper.service';
import { DatabaseService } from '../common/database.service';

async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('RANKWELL PAPER.CLUB SCRAPER');
  console.log('='.repeat(60) + '\n');

  // Parse command line arguments
  const args = process.argv.slice(2);
  const options = {
    calculateBQS: !args.includes('--no-bqs'),
    saveToFile: !args.includes('--no-save'),
    sendToAPI: !args.includes('--no-api'),
    truncateFirst: args.includes('--truncate'),
  };

  console.log('Options:');
  console.log(`  - Calculate BQS: ${options.calculateBQS}`);
  console.log(`  - Save to file: ${options.saveToFile}`);
  console.log(`  - Send to API (per category): ${options.sendToAPI}`);
  console.log(`  - Truncate database first: ${options.truncateFirst}`);
  console.log('');

  try {
    // Create NestJS application context
    const app = await NestFactory.createApplicationContext(AppModule, {
      logger: ['log', 'error', 'warn'],
    });

    // Get services
    const scraperService = app.get(PaperClubScraperService);
    const dbService = app.get(DatabaseService);

    // Truncate database if requested
    if (options.truncateFirst && options.sendToAPI) {
      console.log('Truncating database first...');
      await dbService.truncateTable();
      console.log('Database truncated.\n');
    }

    // Run the scraper
    // NOTE: Data is now sent to API after EACH category is scraped
    console.log('Starting scraping process...\n');
    const scrapedData = await scraperService.scrapeAllCategories({
      calculateBQS: options.calculateBQS,
      saveToFile: options.saveToFile,
      sendToAPI: options.sendToAPI,
    });

    // Print final statistics
    const stats = scraperService.getStatistics(scrapedData.categories);
    console.log('\n' + '='.repeat(60));
    console.log('FINAL STATISTICS');
    console.log('='.repeat(60));
    console.log(`Total Sites: ${stats.totalSites}`);
    console.log(`Average BQS: ${stats.averageBQS}`);
    console.log('\nQuality Distribution:');
    Object.entries(stats.qualityDistribution).forEach(([tier, count]) => {
      console.log(`  ${tier}: ${count}`);
    });
    console.log('\nTop Categories:');
    stats.topCategories.slice(0, 5).forEach((cat, i) => {
      console.log(`  ${i + 1}. ${cat.category}: ${cat.count} sites`);
    });
    console.log('');

    // Close application
    await app.close();

    console.log('✓ Scraping complete!');
    console.log('='.repeat(60) + '\n');

    process.exit(0);
  } catch (error) {
    console.error('\n✗ Error during scraping:');
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
