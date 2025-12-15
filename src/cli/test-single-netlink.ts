import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { NetlinkScraperService } from '../modules/paperclub/services/netlink-scraper.service';
import { LightpandaService } from '../common/lightpanda.service';
import { DashboardHttpClient } from '../common/dashboard-http-client.service';
import * as fs from 'fs/promises';
import * as path from 'path';

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

  // Get URL, landing page, and optional netlink_id from command line
  const url = process.argv[2];
  const landingPage = process.argv[3];
  const netlinkId = process.argv[4] ? parseInt(process.argv[4], 10) : null;

  if (!url || !landingPage) {
    console.error('\n❌ Error: Both URL and landing page are required');
    console.log('\nUsage:');
    console.log('  npm run test:single-netlink <url> <landing_page> [netlink_id]');
    console.log('\nExample:');
    console.log('  npm run test:single-netlink "https://ilbi.org/marche-immobilier-a-paris-6eme/" "https://www.district-immo.com/agences/saint-germain/" 123');
    console.log('\nNote: If netlink_id is provided, results will be sent to the API');
    process.exit(1);
  }

  console.log(`\nURL to scrape: ${url}`);
  console.log(`Landing page to find: ${landingPage}`);
  if (netlinkId) {
    console.log(`Netlink ID: ${netlinkId}`);
  }
  console.log('');

  const app = await NestFactory.createApplicationContext(AppModule);
  const lightpandaService = app.get(LightpandaService);
  const dashboardClient = app.get(DashboardHttpClient);

  try {
    console.log('Starting browser and navigating to URL...\n');

    await lightpandaService.withPage(async (page) => {
      // Navigate to the page
      const response = await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });

      const statusCode = response?.status();
      console.log('✓ Page loaded successfully');
      console.log(`✓ HTTP Status Code: ${statusCode}\n`);

      // Wait for body
      await page.waitForSelector('body', { timeout: 5000 });

      // Get and save page source
      const pageSource = await page.content();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const logsDir = path.join(process.cwd(), 'logs', 'page-sources');
      await fs.mkdir(logsDir, { recursive: true });

      const sourceFilePath = path.join(logsDir, `page-source-${timestamp}.html`);
      await fs.writeFile(sourceFilePath, pageSource, 'utf-8');

      console.log(`✓ Page source saved to: ${sourceFilePath}\n`);

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

      console.log(`\n✓ Found ${linksData.length} links on the page`);

      // Save all links to JSON file for easier analysis
      const linksFilePath = path.join(logsDir, `links-${timestamp}.json`);
      await fs.writeFile(linksFilePath, JSON.stringify({
        url,
        landingPage,
        scrapedAt: new Date().toISOString(),
        totalLinks: linksData.length,
        links: linksData,
      }, null, 2), 'utf-8');
      console.log(`✓ All links saved to: ${linksFilePath}`);

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
      const matchedLinks: any[] = [];

      // Check each link (only log matches)
      for (const link of linksData) {
        const matchResult = checkUrlMatch(link.href, landingPage);

        if (matchResult.matched) {
          matchFound = true;
          const linkType = link.rel.toLowerCase().includes('nofollow') ? 'nofollow' : 'dofollow';
          matchedLinks.push({
            href: link.href,
            text: link.text,
            rel: link.rel || 'none',
            linkType,
            matchType: matchResult.matchType,
          });
        }
      }

      // Display matched links
      if (matchedLinks.length > 0) {
        console.log('='.repeat(80));
        console.log(`✅ FOUND ${matchedLinks.length} MATCHING LINK(S)`);
        console.log('='.repeat(80));
        matchedLinks.forEach((link, idx) => {
          console.log(`\n${idx + 1}. HREF: ${link.href}`);
          console.log(`   TEXT: ${link.text.substring(0, 100)}${link.text.length > 100 ? '...' : ''}`);
          console.log(`   MATCH TYPE: ${link.matchType}`);
          console.log(`   LINK TYPE: ${link.linkType}`);
          console.log(`   REL: ${link.rel}`);
        });
        console.log('\n');
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
      }
      console.log('='.repeat(80));

      // Show what would be sent to API
      console.log('\n');
      console.log('='.repeat(80));
      console.log('API PAYLOAD (what would be sent to /netlink/additionalInfo/upsert)');
      console.log('='.repeat(80));

      // Determine online_status
      let onlineStatus: number;
      let linkType = 'unknown';

      if (statusCode === undefined || statusCode >= 500) {
        // Site not accessible
        onlineStatus = 3;
      } else if (matchFound) {
        // Exact link found
        onlineStatus = 1;
        linkType = matchedLinks[0]?.linkType || 'unknown';
      } else {
        // Check if domain exists on page
        const landingDomain = normalizeUrl(landingPage).split('/')[0];
        const domainFound = linksData.some(link => {
          const linkDomain = normalizeUrl(link.href).split('/')[0];
          return linkDomain === landingDomain;
        });

        if (domainFound) {
          onlineStatus = 4; // Domain found but not exact URL
        } else {
          onlineStatus = 2; // No matching link found
        }
      }

      const apiPayload = {
        netlink_id: netlinkId || 'NETLINK_ID',
        link_type: linkType,
        online_status: onlineStatus,
        status_code: statusCode,
      };

      console.log(JSON.stringify(apiPayload, null, 2));
      console.log('\nOnline Status Legend:');
      console.log('  1 = Exact link found & accessible');
      console.log('  2 = No matching link found');
      console.log('  3 = Site not accessible/offline');
      console.log('  4 = Domain found but not exact URL');
      console.log('='.repeat(80));

      // Send to API if netlink_id is provided
      if (netlinkId) {
        console.log('\n');
        console.log('='.repeat(80));
        console.log('SENDING TO API');
        console.log('='.repeat(80));

        try {
          const requestBody = {
            items: [
              {
                netlink_id: netlinkId,
                link_type: linkType,
                online_status: onlineStatus,
                status_code: statusCode,
              }
            ]
          };

          console.log('\nPosting to /netlink/additionalInfo/upsert...');
          const response = await dashboardClient.post(
            '/netlink/additionalInfo/upsert',
            requestBody
          );

          console.log('✅ Successfully sent to API');
          console.log('\nAPI Response:');
          console.log(JSON.stringify(response, null, 2));
        } catch (error) {
          console.error('❌ Failed to send to API:', error.message);
          if (error.response) {
            console.error('Response data:', JSON.stringify(error.response.data, null, 2));
          }
        }
        console.log('='.repeat(80));
      } else {
        console.log('\n💡 Tip: Provide a netlink_id as third argument to send results to API');
      }

      // Save test summary
      const summaryFilePath = path.join(logsDir, `summary-${timestamp}.json`);
      await fs.writeFile(summaryFilePath, JSON.stringify({
        testUrl: url,
        landingPage,
        testedAt: new Date().toISOString(),
        matchFound,
        totalLinksFound: linksData.length,
        normalizedLandingPage: normalizeUrl(landingPage),
        files: {
          pageSource: sourceFilePath,
          allLinks: linksFilePath,
          summary: summaryFilePath,
        },
      }, null, 2), 'utf-8');

      console.log(`\n✓ Test summary saved to: ${summaryFilePath}`);
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
