import { Logger } from '@nestjs/common';
import * as cron from 'node-cron';

/**
 * CronManager - Singleton class to manage all cron jobs
 *
 * Usage:
 *   const cronManager = CronManager.getInstance();
 *   cronManager.add("job-name", "0 21 * * *", async () => { ... });
 */
export class CronManager {
  private static instance: CronManager;
  private readonly logger = new Logger('CronManager');
  private readonly jobs: Map<string, cron.ScheduledTask> = new Map();
  private timezone: string = 'Europe/Paris';

  private constructor() {}

  /**
   * Get singleton instance of CronManager
   */
  static getInstance(): CronManager {
    if (!CronManager.instance) {
      CronManager.instance = new CronManager();
    }
    return CronManager.instance;
  }

  /**
   * Set timezone for all cron jobs
   */
  setTimezone(timezone: string): void {
    this.timezone = timezone;
    this.logger.log(`Timezone set to: ${timezone}`);
  }

  /**
   * Add a new cron job
   *
   * @param name - Unique name for the job
   * @param schedule - Cron expression (e.g., "0 21 * * *" for 9 PM daily)
   * @param callback - Function to execute
   * @param options - Optional cron options (timezone will use manager's timezone if not specified)
   */
  add(
    name: string,
    schedule: string,
    callback: () => void | Promise<void>,
    options?: { timezone?: string }
  ): void {
    // Check if job already exists
    if (this.jobs.has(name)) {
      this.logger.warn(`Cron job "${name}" already exists. Skipping.`);
      return;
    }

    // Create the job with timezone
    const job = cron.schedule(
      schedule,
      async () => {
        try {
          await callback();
        } catch (error) {
          this.logger.error(`Cron job "${name}" failed: ${error.message}`);
          this.logger.error(error.stack);
        }
      },
      {
        timezone: options?.timezone || this.timezone,
      }
    );

    this.jobs.set(name, job);
    this.logger.log(`✓ Cron job scheduled: "${name}"`);
    this.logger.log(`  Schedule: ${schedule}`);
    this.logger.log(`  Timezone: ${options?.timezone || this.timezone}`);
  }

  /**
   * Remove a cron job
   */
  remove(name: string): boolean {
    const job = this.jobs.get(name);
    if (job) {
      job.stop();
      this.jobs.delete(name);
      this.logger.log(`✓ Stopped cron job: "${name}"`);
      return true;
    }
    this.logger.warn(`Cron job "${name}" not found`);
    return false;
  }

  /**
   * Stop all cron jobs
   */
  stopAll(): void {
    this.logger.log('Stopping all cron jobs...');
    this.jobs.forEach((job, name) => {
      job.stop();
      this.logger.log(`  ✓ Stopped: ${name}`);
    });
    this.jobs.clear();
  }

  /**
   * Get status of all jobs
   */
  getJobs(): Array<{ name: string; status: 'running' }> {
    const status: Array<{ name: string; status: 'running' }> = [];
    this.jobs.forEach((job, name) => {
      status.push({ name, status: 'running' });
    });
    return status;
  }

  /**
   * Get number of active jobs
   */
  getJobCount(): number {
    return this.jobs.size;
  }
}
