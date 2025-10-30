#!/usr/bin/env node

/**
 * Test Paper.club Authentication
 *
 * Run this to verify your credentials and API connection
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { PaperClubAPIService } from '../modules/paperclub/services/paperclub-api.service';

async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('TESTING PAPER.CLUB AUTHENTICATION');
  console.log('='.repeat(60) + '\n');

  try {
    const app = await NestFactory.createApplicationContext(AppModule, {
      logger: ['log', 'error', 'warn', 'debug'],
    });

    const apiService = app.get(PaperClubAPIService);

    console.log('Step 1: Testing authentication...');
    const token = await apiService.authenticate();

    if (token) {
      console.log('✓ Authentication successful!');
      console.log(`Token: ${token.substring(0, 20)}...`);
    }

    console.log('\nStep 2: Testing API request...');
    console.log('Fetching first page of "Animaux" category...');

    const testCategoryId = '4DPZZQt60rXRwkaFls6VLf'; // Animaux
    const response = await apiService.fetchCategoryPage(testCategoryId, 1, 10);

    console.log(`✓ API request successful!`);
    console.log(`Found ${response.currentPageResults?.length || 0} results`);

    if (response.currentPageResults && response.currentPageResults.length > 0) {
      console.log(`\nSample site: ${response.currentPageResults[0].name}`);
    }

    await app.close();

    console.log('\n' + '='.repeat(60));
    console.log('✓ ALL TESTS PASSED');
    console.log('='.repeat(60) + '\n');

    process.exit(0);
  } catch (error) {
    console.error('\n✗ TEST FAILED');
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
    console.error('\nFull error:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { main };
