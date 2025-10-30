#!/usr/bin/env node

/**
 * Test scraping a single category
 * Useful for quick testing without running all categories
 *
 * Usage:
 *   npm run test:category              # Scrape first category (Animaux)
 *   npm run test:category -- Sport     # Scrape Sport category
 *   npm run test:category -- 0         # Scrape by index (0 = Animaux)
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { PaperClubScraperService } from '../modules/paperclub/services/paperclub-scraper.service';
import { PAPERCLUB_CATEGORIES, Category } from '../config/categories.config';

async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('TESTING SINGLE CATEGORY SCRAPE');
  console.log('='.repeat(60) + '\n');

  // Parse command line arguments
  const args = process.argv.slice(2);
  let testCategory: Category | undefined;

  if (args.length > 0) {
    const input = args[0];

    // Check if it's a number (index)
    if (/^\d+$/.test(input)) {
      const index = parseInt(input);
      if (index >= 0 && index < PAPERCLUB_CATEGORIES.length) {
        testCategory = PAPERCLUB_CATEGORIES[index];
      } else {
        console.error(`Error: Index ${index} out of range (0-${PAPERCLUB_CATEGORIES.length - 1})`);
        listCategories();
        process.exit(1);
      }
    } else {
      // Search by name
      testCategory = PAPERCLUB_CATEGORIES.find(
        cat => cat.name.toLowerCase().includes(input.toLowerCase())
      );

      if (!testCategory) {
        console.error(`Error: Category "${input}" not found`);
        listCategories();
        process.exit(1);
      }
    }
  } else {
    // Default to first category
    testCategory = PAPERCLUB_CATEGORIES[0];
  }

  console.log(`Testing category: ${testCategory.name}`);
  console.log(`Category ID: ${testCategory.id}\n`);

  try {
    const app = await NestFactory.createApplicationContext(AppModule, {
      logger: ['log', 'error', 'warn'],
    });

    const scraperService = app.get(PaperClubScraperService);

    // scrapeCategory(category, calculateBQS, sendToAPI)
    // By default, sendToAPI is true - data will be sent after scraping
    const result = await scraperService.scrapeCategory(testCategory, true, true);

    console.log('\n' + '='.repeat(60));
    console.log('RESULTS');
    console.log('='.repeat(60));
    console.log(`Category: ${result.category}`);
    console.log(`Total sites: ${result.total}`);

    if (result.sites.length > 0) {
      // Show top 3 sites with best BQS scores
      const topSites = result.sites
        .filter(s => s.bqs_score)
        .sort((a, b) => (b.bqs_score || 0) - (a.bqs_score || 0))
        .slice(0, 3);

      if (topSites.length > 0) {
        console.log(`\nTop ${topSites.length} sites by BQS:`);
        topSites.forEach((site, i) => {
          console.log(`\n${i + 1}. ${site.name}`);
          console.log(`   TF: ${site.tf || 'N/A'} | CF: ${site.cf || 'N/A'} | DR: ${site.domainRating || 'N/A'}`);
          console.log(`   Traffic: ${site.traffic || 'N/A'} | Price: €${site.articles_price || 'N/A'}`);
          console.log(`   BQS: ${site.bqs_score} (${site.bqs_score_info?.bqs_quality_tier || 'N/A'})`);
          console.log(`   Filter: ${site.bqs_score_info?.bqs_passed_filter ? '✓ PASSED' : '✗ ' + site.bqs_score_info?.bqs_filter_reason}`);
        });
      }

      // Show quality distribution
      const qualityDist = {
        Excellent: 0,
        Good: 0,
        Fair: 0,
        Poor: 0,
      };
      result.sites.forEach(site => {
        const tier = site.bqs_score_info?.bqs_quality_tier;
        if (tier && qualityDist[tier] !== undefined) {
          qualityDist[tier]++;
        }
      });

      console.log('\nQuality Distribution:');
      Object.entries(qualityDist).forEach(([tier, count]) => {
        console.log(`  ${tier}: ${count} sites`);
      });
    }

    await app.close();

    console.log('\n✓ Test successful!');
    console.log('='.repeat(60) + '\n');

    process.exit(0);
  } catch (error) {
    console.error('\n✗ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

function listCategories() {
  console.log('\nAvailable categories:');
  PAPERCLUB_CATEGORIES.forEach((cat, i) => {
    console.log(`  ${i}: ${cat.name}`);
  });
  console.log('\nUsage examples:');
  console.log('  npm run test:category -- Sport');
  console.log('  npm run test:category -- 5');
  console.log('  npm run test:category -- "High-Tech"');
}

if (require.main === module) {
  main();
}

export { main };
