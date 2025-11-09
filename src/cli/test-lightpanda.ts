import { LightpandaService } from '../common/lightpanda.service';
import { ConfigService } from '@nestjs/config';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Test script to verify Lightpanda cloud connection
 *
 * This script:
 * 1. Connects to Lightpanda cloud browser
 * 2. Navigates to a test page
 * 3. Extracts some content to verify it's working
 * 4. Cleans up resources
 */
async function testLightpanda() {
  console.log('='.repeat(60));
  console.log('TESTING LIGHTPANDA CLOUD BROWSER');
  console.log('='.repeat(60));

  const configService = new ConfigService();
  const lightpandaService = new LightpandaService(configService);

  try {
    // Test 1: Connect to cloud browser
    console.log('\n1. Connecting to Lightpanda cloud browser...');
    const browser = await lightpandaService.startBrowser();
    console.log('✓ Cloud browser connected successfully');
    console.log(`   Browser version: ${browser.version()}`);

    // Test 2: Create a page and navigate
    console.log('\n2. Creating page and navigating to example.com...');
    const { page, context } = await lightpandaService.navigateToPage(
      'https://example.com',
      { waitUntil: 'domcontentloaded', timeout: 10000 },
    );
    console.log('✓ Page loaded successfully');

    // Test 3: Extract content
    console.log('\n3. Extracting page content...');
    const title = await page.title();
    const heading = await page.locator('h1').first().textContent();
    console.log(`   Page title: ${title}`);
    console.log(`   H1 heading: ${heading}`);

    // Test 4: Using withPage helper for Hacker News search
    console.log('\n4. Testing withPage helper with Hacker News...');
    const searchResults = await lightpandaService.withPage(async (p) => {
      await p.goto('https://news.ycombinator.com/', { timeout: 10000 });
      const title = await p.title();
      console.log(`   HN page title: ${title}`);

      // Get first story title as a simple test
      const firstStory = await p.locator('.titleline > a').first().textContent();
      return firstStory;
    });
    console.log(`✓ First HN story: ${searchResults}`);

    // Cleanup
    await page.close();
    await context.close();

    console.log('\n5. Checking browser status...');
    console.log(`   Is running: ${lightpandaService.isRunning()}`);

    console.log('\n='.repeat(60));
    console.log('ALL TESTS PASSED ✓');
    console.log('='.repeat(60));
  } catch (error) {
    console.error('\n✗ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    // Cleanup
    await lightpandaService.stopBrowser();
  }
}

testLightpanda();
