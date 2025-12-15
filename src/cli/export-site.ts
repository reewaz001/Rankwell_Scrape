import { exportSiteToBigQuery } from './export-and-upload-to-bigquery';

/**
 * CLI tool to export a single site to BigQuery
 *
 * Usage:
 *   npm run export:site <site_url> <start_date> <end_date>
 *
 * Example:
 *   npm run export:site "https://www.menzzo.fr/" 2024-11-01 2024-11-30
 */

function showUsage() {
  console.log('\n' + '='.repeat(80));
  console.log('EXPORT SINGLE SITE TO BIGQUERY - USAGE');
  console.log('='.repeat(80));
  console.log(`
Usage:
  npm run export:site <site_url> <start_date> <end_date>

Arguments:
  site_url      Site URL (e.g., "https://example.com/" or "sc-domain:example.com")
  start_date    Startwwww date in YYYY-MM-DD format
  end_date      End date in YYYY-MM-DD format

Examples:
  # Export a single site
  npm run export:site "https://www.menzzo.fr/" 2024-11-01 2024-11-30

  # Export with domain prefix
  npm run export:site "sc-domain:certideal.com" 2024-11-01 2024-11-30

Notes:
  - Wrap site URL in quotes if it contains special characters
  - Data is fetched day-by-day to avoid API slowdowns
  - Data is uploaded directly to BigQuery (no intermediate files)
  `);
  console.log('='.repeat(80) + '\n');
}

async function main() {
  const args = process.argv.slice(2);

  // Check if help is requested
  if (args.includes('--help') || args.includes('-h') || args.length === 0) {
    showUsage();
    process.exit(0);
  }

  // Check arguments
  if (args.length !== 3) {
    console.error('\n❌ Error: Invalid number of arguments\n');
    showUsage();
    process.exit(1);
  }

  const [siteUrl, startDate, endDate] = args;

  // Validate dates
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
    console.error('\n❌ Error: Dates must be in YYYY-MM-DD format\n');
    showUsage();
    process.exit(1);
  }

  // Validate site URL
  if (!siteUrl || siteUrl.trim() === '') {
    console.error('\n❌ Error: Site URL cannot be empty\n');
    showUsage();
    process.exit(1);
  }

  try {
    // Export the site
    const result = await exportSiteToBigQuery(siteUrl, startDate, endDate);

    console.log('\n✓ Export completed successfully!');
    console.log(`  Rows fetched: ${result.rowsFetched}`);
    console.log(`  Rows uploaded: ${result.rowsUploaded}\n`);

    process.exit(0);

  } catch (error) {
    console.error('\n✗ Export failed:', error.message);
    if (error.stack) {
      console.error('\nStack trace:', error.stack);
    }
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { main };
