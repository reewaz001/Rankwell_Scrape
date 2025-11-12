import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { NetlinkScraperService } from '../modules/paperclub/services/netlink-scraper.service';
import { LightpandaService } from '../common/lightpanda.service';

/**
 * Test script for debugging a single netlink scraping issue
 *
 * This script helps you debug why link matching might have failed by:
 * 1. Scraping the specific URL
 * 2. Showing all links found on the page
 * 3. Showing detailed matching logic for each link
 * 4. Helping identify why the landing page link wasn't found
 *
 * Usage:
 *   npm run test:single-netlink <url> <landing_page>
 *
 * Example:
 *   npm run test:single-netlink "https://ilbi.org/marche-immobilier-a-paris-6eme/" "https://www.district-immo.com/agences/saint-germain/"
 */
async function testSingleNetlink() {
  console.log('='.repeat(80));
  console.log('DEBUG SINGLE NETLINK SCRAPING');
  console.log('='.repeat(80));

  // Get URL and landing page from command line
  const url = process.argv[2];
  const landingPage = process.argv[3];

  if (!url || !landingPage) {
    console.error('\n❌ Error: Both URL and landing page are required');
    console.log('\nUsage:');
    console.log('  npm run test:single-netlink <url> <landing_page>');
    console.log('\nExample:');
    console.log('  npm run test:single-netlink "https://ilbi.org/marche-immobilier-a-paris-6eme/" "https://www.district-immo.com/agences/saint-germain/"');
    process.exit(1);
  }

  console.log(`\nURL to scrape: ${url}`);
  console.log(`Landing page to find: ${landingPage}\n`);

  const app = await NestFactory.createApplicationContext(AppModule);
  const lightpandaService = app.get(LightpandaService);

  try {
    console.log('Starting browser and navigating to URL...\n');

    await lightpandaService.withPage(async (page) => {
      // Navigate to the page
      await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });

      console.log('✓ Page loaded successfully\n');

      // Wait for body
      await page.waitForSelector('body', { timeout: 5000 });

      // Get all links with detailed information
      const linksData = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a'));
        return links.map((link, index) => ({
          index: index + 1,
          href: link.href,
          text: link.textContent?.trim() || '',
          rel: link.getAttribute('rel') || '',
          class: link.className || '',
          id: link.id || '',
          outerHTML: link.outerHTML.substring(0, 200), // First 200 chars
        }));
      });

      console.log('='.repeat(80));
      console.log(`FOUND ${linksData.length} LINKS ON THE PAGE`);
      console.log('='.repeat(80));

      // Helper function to normalize URL
      const normalizeUrl = (urlStr: string): string => {
        try {
          let normalized = urlStr.toLowerCase().trim();
          normalized = normalized.replace(/^https?:\/\//, '');
          normalized = normalized.replace(/^www\./, '');
          normalized = normalized.replace(/\/$/, '');
          normalized = normalized.split('?')[0].split('#')[0];
          return normalized;
        } catch (error) {
          return urlStr.toLowerCase().trim();
        }
      };

      // Helper function to check URL match (same logic as in scraper service)
      const checkUrlMatch = (linkHref: string, landingPageUrl: string): { matched: boolean; matchType?: string; reason?: string } => {
        if (!linkHref || !landingPageUrl) {
          return { matched: false, reason: 'Empty URL' };
        }

        const normalizedLink = normalizeUrl(linkHref);
        const normalizedLanding = normalizeUrl(landingPageUrl);

        console.log(`    Normalized link: "${normalizedLink}"`);
        console.log(`    Normalized landing: "${normalizedLanding}"`);

        // Exact match
        if (normalizedLink === normalizedLanding) {
          return { matched: true, matchType: 'exact' };
        }

        // Link contains the landing page (e.g., landing is a subdirectory)
        if (normalizedLink.includes(normalizedLanding)) {
          return { matched: true, matchType: 'domain (link contains landing)' };
        }

        // Landing contains the link (e.g., link is shorter/partial)
        if (normalizedLanding.includes(normalizedLink)) {
          return { matched: true, matchType: 'subdomain (landing contains link)' };
        }

        // Extract domain and path separately for more flexible matching
        const getDomain = (urlStr: string) => {
          return urlStr.split('/')[0];
        };

        const getPath = (urlStr: string) => {
          const parts = urlStr.split('/');
          return parts.slice(1).join('/');
        };

        const linkDomain = getDomain(normalizedLink);
        const landingDomain = getDomain(normalizedLanding);
        const linkPath = getPath(normalizedLink);
        const landingPath = getPath(normalizedLanding);

        console.log(`    Link domain: "${linkDomain}"`);
        console.log(`    Landing domain: "${landingDomain}"`);
        console.log(`    Link path: "${linkPath}"`);
        console.log(`    Landing path: "${landingPath}"`);

        // Same domain check
        if (linkDomain === landingDomain) {
          // If domains match, check if paths are similar
          if (linkPath === landingPath) {
            return { matched: true, matchType: 'exact (same domain and path)' };
          }
          // Check if one path contains the other
          if (linkPath && landingPath && (linkPath.includes(landingPath) || landingPath.includes(linkPath))) {
            return { matched: true, matchType: 'partial (same domain, similar path)' };
          }
          // If paths don't match but domains do, still consider it a domain match
          if (linkPath && landingPath) {
            return { matched: true, matchType: 'domain match (same domain, different path)' };
          }
        }

        // Check if link domain is part of landing domain or vice versa
        if (linkDomain.includes(landingDomain) || landingDomain.includes(linkDomain)) {
          return { matched: true, matchType: 'subdomain match' };
        }

        return { matched: false, reason: 'No match found' };
      };

      console.log('\n');
      let matchFound = false;

      // Check each link
      for (const link of linksData) {
        console.log('-'.repeat(80));
        console.log(`Link #${link.index}`);
        console.log('-'.repeat(80));
        console.log(`  HREF: ${link.href}`);
        console.log(`  TEXT: ${link.text.substring(0, 100)}${link.text.length > 100 ? '...' : ''}`);
        console.log(`  REL: ${link.rel || 'none'}`);
        console.log(`  CLASS: ${link.class || 'none'}`);
        console.log(`  ID: ${link.id || 'none'}`);
        console.log(`\n  Checking match against landing page...`);

        const matchResult = checkUrlMatch(link.href, landingPage);

        if (matchResult.matched) {
          console.log(`  ✅ MATCH FOUND! (${matchResult.matchType})`);
          console.log(`  Link Type: ${link.rel.toLowerCase().includes('nofollow') ? 'nofollow' : 'dofollow'}`);
          matchFound = true;

          console.log(`\n  HTML:`);
          console.log(`  ${link.outerHTML}`);
        } else {
          console.log(`  ❌ No match (${matchResult.reason})`);
        }
        console.log('');
      }

      console.log('='.repeat(80));
      if (matchFound) {
        console.log('✓ LINK MATCH FOUND ON PAGE');
      } else {
        console.log('✗ NO LINK MATCH FOUND ON PAGE');
        console.log('\nPossible reasons:');
        console.log('  1. The link might be loaded dynamically with JavaScript');
        console.log('  2. The link might be in an iframe');
        console.log('  3. The landing page URL format might be different than expected');
        console.log('  4. The link might be hidden or not rendered');
        console.log('\nAll links found on the page are listed above for manual inspection.');
      }
      console.log('='.repeat(80));

      // Show normalized URLs for comparison
      console.log('\n' + '='.repeat(80));
      console.log('NORMALIZED URL COMPARISON');
      console.log('='.repeat(80));
      console.log(`Landing page (normalized): "${normalizeUrl(landingPage)}"`);
      console.log('\nAll link HREFs (normalized):');
      linksData.forEach((link, index) => {
        console.log(`  ${index + 1}. "${normalizeUrl(link.href)}"`);
      });
      console.log('='.repeat(80));
    });

    console.log('\n✓ Test completed successfully');

  } catch (error) {
    console.error('\n✗ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await app.close();
  }
}

// Run the test
if (require.main === module) {
  testSingleNetlink().catch(console.error);
}

export { testSingleNetlink };
