import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { GoogleSearchConsoleService } from '../common/google-search-console.service';
import { BigQuery } from '@google-cloud/bigquery';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Export Google Search Console data and upload directly to BigQuery
 *
 * Fetches data from GSC and inserts directly to BigQuery without creating CSV files
 *
 * Usage:
 *   npm run export:upload:bigquery <start_date> <end_date>
 *
 * Example:
 *   npm run export:upload:bigquery 2024-10-21 2024-10-22
 */

// BigQuery configuration
const PROJECT_ID = 'dashboard-1603872171362';
const DATASET_ID = 'searchconsole';
const TABLE_ID = 'search_console_data';

/**
 * Generate daily date chunks from start to end date
 * This avoids GSC API pagination slowdown with large datasets
 */
function generateDateChunks(startDate: string, endDate: string): { startDate: string; endDate: string }[] {
  const chunks: { startDate: string; endDate: string }[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);

  let current = new Date(start);
  while (current <= end) {
    const dateStr = current.toISOString().split('T')[0];
    chunks.push({ startDate: dateStr, endDate: dateStr });
    current.setDate(current.getDate() + 1);
  }

  return chunks;
}

/**
 * Export a single site to BigQuery
 *
 * @param siteUrl - The site URL to export (e.g., 'https://example.com/' or 'sc-domain:example.com')
 * @param startDate - Start date in YYYY-MM-DD format
 * @param endDate - End date in YYYY-MM-DD format
 * @returns Object with rowsFetched and rowsUploaded counts
 */
async function exportSiteToBigQuery(
  siteUrl: string,
  startDate: string,
  endDate: string
): Promise<{ rowsFetched: number; rowsUploaded: number }> {
  console.log('='.repeat(80));
  console.log(`EXPORTING SITE TO BIGQUERY`);
  console.log('='.repeat(80));
  console.log(`\nSite: ${siteUrl}`);
  console.log(`Date Range: ${startDate} to ${endDate}\n`);

  // Validate dates
  if (!isValidDate(startDate) || !isValidDate(endDate)) {
    throw new Error('Invalid date format. Use YYYY-MM-DD');
  }

  // Initialize services
  const app = await NestFactory.createApplicationContext(AppModule);
  const gscService = app.get(GoogleSearchConsoleService);

  try {
    // Initialize BigQuery
    const serviceAccountPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH;
    if (!serviceAccountPath) {
      throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY_PATH not set in environment');
    }

    console.log('1. Initializing BigQuery client...');
    const bigquery = new BigQuery({
      projectId: PROJECT_ID,
      keyFilename: serviceAccountPath,
    });
    const dataset = bigquery.dataset(DATASET_ID);
    const table = dataset.table(TABLE_ID);
    console.log('   ✓ BigQuery ready\n');

    // Split date range into daily chunks
    const dateChunks = generateDateChunks(startDate, endDate);
    console.log(`2. Fetching data (${dateChunks.length} days)...\n`);

    // Fetch data for this site
    const siteData: any[] = [];

    for (let i = 0; i < dateChunks.length; i++) {
      const chunk = dateChunks[i];
      const progress = `[${i + 1}/${dateChunks.length}]`;

      try {
        console.log(`   ${progress} Fetching ${chunk.startDate}...`);
        const data = await gscService.getSearchAnalyticsPaginated({
          siteUrl,
          startDate: chunk.startDate,
          endDate: chunk.endDate,
          dimensions: ['query', 'page', 'country', 'device', 'date'] as any,
          rowLimit: 25000,
        });
        siteData.push(...data.map(row => ({ site_url: siteUrl, ...row })));
        console.log(`       ✓ ${data.length} rows`);
      } catch (error) {
        console.error(`       ✗ Failed: ${error.message}`);
      }
    }

    console.log(`\n   ✓ Fetched: ${siteData.length} total rows\n`);

    // Upload to BigQuery
    if (siteData.length === 0) {
      console.log('   ⚠ No data to upload\n');
      await app.close();
      return { rowsFetched: 0, rowsUploaded: 0 };
    }

    console.log(`3. Uploading ${siteData.length} rows to BigQuery...\n`);

    // Convert to BigQuery format
    const bqRows = siteData.map(row => ({
      site_url: row.site_url || '',
      query: row.keys?.[0] || '',
      page: row.keys?.[1] || '',
      country: row.keys?.[2] || '',
      device: row.keys?.[3] || '',
      date: row.keys?.[4] || '',
      clicks: row.clicks || 0,
      impressions: row.impressions || 0,
      ctr: row.ctr || 0,
      position: row.position || 0,
    }));

    // Upload in batches
    const batchSize = 10000;
    let uploaded = 0;

    for (let i = 0; i < bqRows.length; i += batchSize) {
      const batch = bqRows.slice(i, i + batchSize);
      await table.insert(batch);
      uploaded += batch.length;
      console.log(`   ... uploaded ${uploaded} / ${bqRows.length} rows`);
    }

    console.log('\n='.repeat(80));
    console.log('✓ EXPORT COMPLETE');
    console.log('='.repeat(80));
    console.log(`\nRows Fetched: ${siteData.length}`);
    console.log(`Rows Uploaded: ${uploaded}`);
    console.log(`\nBigQuery Table: ${PROJECT_ID}.${DATASET_ID}.${TABLE_ID}\n`);

    await app.close();
    return { rowsFetched: siteData.length, rowsUploaded: uploaded };

  } catch (error) {
    console.error('\n✗ Export failed:', error.message);
    await app.close();
    throw error;
  }
}

async function exportAndUploadToBigQuery() {
  console.log('='.repeat(80));
  console.log('EXPORT GSC DATA & UPLOAD TO BIGQUERY');
  console.log('='.repeat(80));

  const startDate = process.argv[2];
  const endDate = process.argv[3];

  if (!startDate || !endDate) {
    showUsage();
    process.exit(1);
  }

  if (!isValidDate(startDate) || !isValidDate(endDate)) {
    console.error('\n❌ Error: Dates must be in YYYY-MM-DD format');
    showUsage();
    process.exit(1);
  }

  console.log(`\nDate Range: ${startDate} to ${endDate}`);
  console.log('='.repeat(80));

  const app = await NestFactory.createApplicationContext(AppModule);
  const gscService = app.get(GoogleSearchConsoleService);

  try {
    // ========================================================================
    // STEP 1: FETCH GSC DATA
    // ========================================================================
    console.log('\n' + '='.repeat(80));
    console.log('STEP 1: FETCHING DATA FROM GOOGLE SEARCH CONSOLE');
    console.log('='.repeat(80) + '\n');

    // Get all sites
    console.log('1. Fetching sites...\n');
    const sites = await gscService.getSitesList();

    if (sites.length === 0) {
      console.log('❌ No sites found.');
      process.exit(1);
    }

    console.log(`✓ Found ${sites.length} sites:\n`);
    sites.forEach((site, index) => {
      console.log(`  ${index + 1}. ${site.siteUrl}`);
    });

    // ========================================================================
    // INITIALIZE BIGQUERY CLIENT FIRST
    // ========================================================================
    console.log('\n' + '='.repeat(80));
    console.log('INITIALIZING BIGQUERY CLIENT');
    console.log('='.repeat(80) + '\n');

    const serviceAccountPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH;

    if (!serviceAccountPath) {
      throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY_PATH not set in environment');
    }

    console.log('1. Initializing BigQuery client...');
    const bigquery = new BigQuery({
      projectId: PROJECT_ID,
      keyFilename: serviceAccountPath,
    });
    console.log('   ✓ BigQuery client initialized\n');

    // Check if dataset exists
    console.log('2. Checking dataset...');
    const dataset = bigquery.dataset(DATASET_ID);
    const [datasetExists] = await dataset.exists();

    if (!datasetExists) {
      console.log(`   ! Dataset '${DATASET_ID}' does not exist. Creating it...`);
      await dataset.create();
      console.log(`   ✓ Dataset '${DATASET_ID}' created\n`);
    } else {
      console.log(`   ✓ Dataset '${DATASET_ID}' exists\n`);
    }

    const table = dataset.table(TABLE_ID);

    // ========================================================================
    // FETCH AND UPLOAD DATA PER SITE (STREAMING)
    // ========================================================================
    console.log('='.repeat(80));
    console.log('FETCHING & UPLOADING DATA (SITE BY SITE)');
    console.log('='.repeat(80) + '\n');

    // Split date range into daily chunks to avoid GSC API pagination slowdown
    const dateChunks = generateDateChunks(startDate, endDate);
    console.log(`Split date range into ${dateChunks.length} daily chunks\n`);

    let grandTotalRows = 0;

    for (let i = 0; i < sites.length; i++) {
      const site = sites[i];
      console.log(`[${i + 1}/${sites.length}] Processing: ${site.siteUrl}`);

      // Collect data for this site only
      const siteData: any[] = [];

      for (let chunkIndex = 0; chunkIndex < dateChunks.length; chunkIndex++) {
        const chunk = dateChunks[chunkIndex];
        const progress = `[${chunkIndex + 1}/${dateChunks.length}]`;

        try {
          console.log(`  ${progress} Fetching ${chunk.startDate}...`);
          const full = await gscService.getSearchAnalyticsPaginated(
            {
              siteUrl: site.siteUrl,
              startDate: chunk.startDate,
              endDate: chunk.endDate,
              dimensions: ['query', 'page', 'country', 'device', 'date'] as any,
              rowLimit: 25000,
            }
          );
          siteData.push(...full.map(row => ({ site_url: site.siteUrl, ...row })));
          console.log(`      ✓ ${full.length} rows`);
        } catch (error) {
          console.error(`      ✗ Failed: ${error.message}`);
        }
      }

      // Upload this site's data to BigQuery
      if (siteData.length > 0) {
        console.log(`\n  → Uploading ${siteData.length} rows to BigQuery...`);

        // Convert GSC data to BigQuery row format
        const bqRows = siteData.map(row => {
          const queryIndex = 0;
          const pageIndex = 1;
          const countryIndex = 2;
          const deviceIndex = 3;
          const dateIndex = 4;

          return {
            site_url: row.site_url || '',
            query: row.keys?.[queryIndex] || '',
            page: row.keys?.[pageIndex] || '',
            country: row.keys?.[countryIndex] || '',
            device: row.keys?.[deviceIndex] || '',
            date: row.keys?.[dateIndex] || '',
            clicks: row.clicks || 0,
            impressions: row.impressions || 0,
            ctr: row.ctr || 0,
            position: row.position || 0,
          };
        });

        // Insert in batches
        const batchSize = 10000;
        let uploaded = 0;

        for (let j = 0; j < bqRows.length; j += batchSize) {
          const batch = bqRows.slice(j, j + batchSize);
          await table.insert(batch);
          uploaded += batch.length;
          console.log(`      ... uploaded ${uploaded} / ${bqRows.length} rows`);
        }

        console.log(`  ✓ Site uploaded: ${siteData.length} rows\n`);
        grandTotalRows += siteData.length;
      } else {
        console.log(`  ! No data for this site\n`);
      }
    }

    console.log('\n✓ All sites processed');
    console.log(`  Total rows uploaded: ${grandTotalRows}\n`);

    // Get table info
    const [tableMetadata] = await table.getMetadata();

    console.log('='.repeat(80));
    console.log('✓ ALL OPERATIONS COMPLETE');
    console.log('='.repeat(80));
    console.log(`\nFetched & Uploaded: ${grandTotalRows} rows`);
    console.log(`\nBigQuery Table: ${PROJECT_ID}.${DATASET_ID}.${TABLE_ID}`);
    console.log(`Total Rows in Table: ${tableMetadata.numRows}`);
    console.log(`Table Size: ${formatBytes(tableMetadata.numBytes)}`);

    console.log('\nView in BigQuery Console:');
    console.log(`https://console.cloud.google.com/bigquery?project=${PROJECT_ID}&ws=!1m5!1m4!4m3!1s${PROJECT_ID}!2s${DATASET_ID}!3s${TABLE_ID}`);

  } catch (error) {
    console.error('\n✗ Operation failed:', error.message);
    console.error(error.stack);
    await app.close();
    process.exit(1);
  }

  await app.close();
  console.log('\n✓ Application closed.');
  process.exit(0);
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

function isValidDate(dateString: string): boolean {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) return false;
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
}

function showUsage() {
  console.log('\n' + '='.repeat(80));
  console.log('USAGE');
  console.log('='.repeat(80));
  console.log(`
Export GSC data and upload directly to BigQuery in one command

SYNTAX:
  npm run export:upload:bigquery <start_date> <end_date>

ARGUMENTS:
  start_date    Start date in YYYY-MM-DD format
  end_date      End date in YYYY-MM-DD format

EXAMPLES:
  npm run export:upload:bigquery 2024-10-21 2024-10-22
  npm run export:upload:bigquery 2024-01-01 2024-01-31

WHAT IT DOES:
  1. Fetches all sites from Google Search Console
  2. Collects full analytics data (query, page, country, device, date)
  3. Inserts data directly to BigQuery (no CSV files created)
  4. Shows BigQuery console link

BIGQUERY CONFIGURATION:
  Project: ${PROJECT_ID}
  Dataset: ${DATASET_ID}
  Table:   ${TABLE_ID}
  Method:  Streaming Insert (no temporary files)

NOTES:
  - No CSV files are created (direct memory-to-BigQuery transfer)
  - Uses service account from GOOGLE_SERVICE_ACCOUNT_KEY_PATH
  - Data is appended to existing BigQuery table
  - Processes large datasets in batches of 10,000 rows
  `);
  console.log('='.repeat(80) + '\n');
}

if (require.main === module) {
  exportAndUploadToBigQuery().catch(console.error);
}

export { exportAndUploadToBigQuery, exportSiteToBigQuery };
