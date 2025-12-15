import { Logger } from '@nestjs/common';
import { testNetlinkScraper } from '../cli/test-netlink-scraper';
import { testNetlinkScraperWithREST } from '../cli/test-netlink-scraper-rest';

const logger = new Logger('CronTasks');

/**
 * Monthly Scraper Job
 * Runs netlink scraper and netlink scraper REST sequentially
 * Only executes on the last day of the month
 */
export async function runMonthlyScraperJob(): Promise<void> {
  // Check if today is actually the last day of the month
  if (!isLastDayOfMonth()) {
    logger.debug('Not the last day of month, skipping monthly scraper...');
    return;
  }

  logger.log('='.repeat(80));
  logger.log('MONTHLY SCRAPER JOB STARTED');
  logger.log('='.repeat(80));
  logger.log(`Date: ${new Date().toISOString()}\n`);

  try {
    // Step 1: Run netlink scraper
    logger.log('Step 1: Running netlink scraper...\n');
    const startTime1 = Date.now();
    await testNetlinkScraper();
    const duration1 = ((Date.now() - startTime1) / 1000).toFixed(2);
    logger.log(`✓ Netlink scraper completed in ${duration1}s\n`);

    // Step 2: Run netlink scraper REST
    logger.log('Step 2: Running netlink scraper REST...\n');
    const startTime2 = Date.now();
    await testNetlinkScraperWithREST();
    const duration2 = ((Date.now() - startTime2) / 1000).toFixed(2);
    logger.log(`✓ Netlink scraper REST completed in ${duration2}s\n`);

    logger.log('\n✓ All scraper jobs completed successfully');
  } catch (error) {
    logger.error(`✗ Scraper job failed: ${error.message}`);
    logger.error(`Stack: ${error.stack}`);
    throw error;
  }

  logger.log('\n' + '='.repeat(80));
  logger.log('MONTHLY SCRAPER JOB COMPLETED');
  logger.log('='.repeat(80) + '\n');
}

/**
 * Check if today is the last day of the current month
 */
function isLastDayOfMonth(): boolean {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.getDate() === 1;
}

/**
 * Get the next last day of month at a specific time
 */
export function getNextLastDayOfMonth(hour: number = 21, minute: number = 0): Date {
  const today = new Date();

  if (isLastDayOfMonth()) {
    const result = new Date(today);
    result.setHours(hour, minute, 0, 0);
    return result;
  }

  let candidate = new Date(today);
  candidate.setMonth(candidate.getMonth() + 1, 0);

  if (candidate < today) {
    candidate.setMonth(candidate.getMonth() + 2, 0);
  }

  candidate.setHours(hour, minute, 0, 0);
  return candidate;
}
