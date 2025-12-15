import { exportSiteToBigQuery } from '../cli/export-and-upload-to-bigquery';

/**
 * Example: Export a single site to BigQuery
 *
 * Usage:
 *   npx ts-node src/examples/export-single-site-example.ts
 */

async function main() {
  try {
    // Example 1: Export a single site
    const result = await exportSiteToBigQuery(
      'https://www.menzzo.fr/',  // Site URL
      '2024-11-01',              // Start date
      '2024-11-30'               // End date
    );

    console.log('\nExport completed!');
    console.log(`Rows fetched: ${result.rowsFetched}`);
    console.log(`Rows uploaded: ${result.rowsUploaded}`);

  } catch (error) {
    console.error('Export failed:', error.message);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { main };
