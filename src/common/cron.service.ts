import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as cron from 'node-cron';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Cron Service
 *
 * Schedules and runs automated tasks on a schedule.
 * Compatible with PM2 and other process managers.
 *
 * Environment Variables:
 * - ENABLE_CRON: Set to 'true' to enable cron jobs (default: false)
 * - CRON_TIMEZONE: Timezone for cron jobs (default: 'Europe/Paris')
 */
@Injectable()
export class CronService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CronService.name);
  private readonly cronJobs: Map<string, cron.ScheduledTask> = new Map();
  private readonly enabled: boolean;
  private readonly timezone: string;

  constructor(private readonly configService: ConfigService) {
    this.enabled = this.configService.get<string>('ENABLE_CRON', 'false') === 'true';
    this.timezone = this.configService.get<string>('CRON_TIMEZONE', 'Europe/Paris');
  }

  onModuleInit() {
    if (!this.enabled) {
      this.logger.warn('Cron jobs are DISABLED. Set ENABLE_CRON=true to enable.');
      return;
    }

    this.logger.log(`Initializing cron jobs (timezone: ${this.timezone})...`);
    this.setupMonthlyScraperJob();
    this.logger.log('✓ Cron jobs initialized');
  }

  onModuleDestroy() {
    this.logger.log('Stopping all cron jobs...');
    this.cronJobs.forEach((job, name) => {
      job.stop();
      this.logger.log(`  ✓ Stopped: ${name}`);
    });
    this.cronJobs.clear();
  }

  /**
   * Set up monthly scraper job - Runs on the last day of each month
   */
  private setupMonthlyScraperJob() {
    // Cron expression: Run at 11:59 PM on the last day of every month
    // Format: minute hour day month day-of-week
    // '59 23 28-31 * *' - Run at 11:59 PM on days 28-31
    // We check if it's actually the last day in the job logic
    const cronExpression = '59 23 28-31 * *';

    const job = cron.schedule(
      cronExpression,
      async () => {
        // Check if today is actually the last day of the month
        if (!this.isLastDayOfMonth()) {
          this.logger.debug('Not the last day of month, skipping...');
          return;
        }

        this.logger.log('='.repeat(80));
        this.logger.log('MONTHLY SCRAPER JOB STARTED');
        this.logger.log('='.repeat(80));
        this.logger.log(`Date: ${new Date().toISOString()}`);
        this.logger.log(`Timezone: ${this.timezone}\n`);

        await this.runMonthlyScraperSequence();

        this.logger.log('\n' + '='.repeat(80));
        this.logger.log('MONTHLY SCRAPER JOB COMPLETED');
        this.logger.log('='.repeat(80) + '\n');
      },
      {
        timezone: this.timezone,
      }
    );

    this.cronJobs.set('monthly-scraper', job);

    const nextRun = this.getNextLastDayOfMonth();
    this.logger.log(`✓ Monthly scraper job scheduled`);
    this.logger.log(`  Schedule: Last day of each month at 11:59 PM`);
    this.logger.log(`  Timezone: ${this.timezone}`);
    this.logger.log(`  Next run: ${nextRun.toLocaleString()}`);
  }

  /**
   * Run the monthly scraper sequence
   */
  private async runMonthlyScraperSequence() {
    try {
      // Step 1: Run test:netlink-scraper
      this.logger.log('Step 1: Running netlink scraper...\n');
      await this.runCommand('npm run test:netlink-scraper', 'test:netlink-scraper');

      // Step 2: Run test:netlink-scraper-rest
      this.logger.log('\nStep 2: Running netlink scraper REST...\n');
      await this.runCommand('npm run test:netlink-scraper-rest', 'test:netlink-scraper-rest');

      this.logger.log('\n✓ All scraper jobs completed successfully');

    } catch (error) {
      this.logger.error(`✗ Scraper job failed: ${error.message}`);
      this.logger.error(`Stack: ${error.stack}`);
    }
  }

  /**
   * Run a shell command and log output
   */
  private async runCommand(command: string, name: string): Promise<void> {
    this.logger.log(`Executing: ${command}`);

    const startTime = Date.now();

    try {
      const { stdout, stderr } = await execAsync(command, {
        maxBuffer: 50 * 1024 * 1024, // 50MB buffer
        cwd: process.cwd(),
      });

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);

      if (stdout) {
        this.logger.log(`\n--- Output from ${name} ---`);
        this.logger.log(stdout);
      }

      if (stderr) {
        this.logger.warn(`\n--- Warnings from ${name} ---`);
        this.logger.warn(stderr);
      }

      this.logger.log(`✓ ${name} completed in ${duration}s`);

    } catch (error) {
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      this.logger.error(`✗ ${name} failed after ${duration}s`);

      if (error.stdout) {
        this.logger.log(`\n--- Output before failure ---`);
        this.logger.log(error.stdout);
      }

      if (error.stderr) {
        this.logger.error(`\n--- Error output ---`);
        this.logger.error(error.stderr);
      }

      throw error;
    }
  }

  /**
   * Check if today is the last day of the current month
   */
  private isLastDayOfMonth(): boolean {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // If tomorrow is the 1st, today is the last day of the month
    return tomorrow.getDate() === 1;
  }

  /**
   * Get the next last day of month
   */
  private getNextLastDayOfMonth(): Date {
    const today = new Date();

    // If today is the last day, return today
    if (this.isLastDayOfMonth()) {
      const result = new Date(today);
      result.setHours(23, 59, 0, 0);
      return result;
    }

    // Otherwise, find the last day of this month or next month
    let candidate = new Date(today);
    candidate.setMonth(candidate.getMonth() + 1, 0); // Last day of current month

    // If we've passed it, go to next month
    if (candidate < today) {
      candidate.setMonth(candidate.getMonth() + 2, 0); // Last day of next month
    }

    candidate.setHours(23, 59, 0, 0);
    return candidate;
  }

  /**
   * Get status of all cron jobs
   */
  getJobStatus(): Array<{ name: string; status: 'running' | 'stopped' }> {
    const status: Array<{ name: string; status: 'running' | 'stopped' }> = [];

    this.cronJobs.forEach((job, name) => {
      status.push({
        name,
        status: 'running', // node-cron doesn't have a direct status check
      });
    });

    return status;
  }

  /**
   * Manually trigger the monthly scraper job (for testing)
   */
  async triggerMonthlyScraperManually(): Promise<void> {
    this.logger.log('Manually triggering monthly scraper job...');
    await this.runMonthlyScraperSequence();
  }
}
