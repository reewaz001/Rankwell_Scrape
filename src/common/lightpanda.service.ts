import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { chromium, Browser, BrowserContext, Page } from 'playwright';

/**
 * Browser Service (Playwright Chromium)
 *
 * Provides a local Playwright Chromium browser instance for scraping.
 * Works on all platforms: Windows, Mac, and Linux.
 *
 * Features:
 * - Local Chromium browser (built into Playwright)
 * - Multiple concurrent contexts supported
 * - Automatic cleanup on module destroy
 * - Browser context and page creation utilities
 * - Headless mode for better performance
 */
@Injectable()
export class LightpandaService implements OnModuleDestroy {
  private readonly logger = new Logger(LightpandaService.name);
  private browser: Browser | null = null;
  private readonly headless: boolean;

  constructor(private readonly configService: ConfigService) {
    // Configuration for Playwright browser
    this.headless = this.configService.get<boolean>('BROWSER_HEADLESS', true);
  }

  /**
   * Start Playwright Chromium browser
   */
  async startBrowser(): Promise<Browser> {
    if (this.browser && this.browser.isConnected()) {
      this.logger.debug('Browser already running, reusing existing instance');
      return this.browser;
    }

    try {
      this.logger.log('Starting Playwright Chromium browser...');

      this.browser = await chromium.launch({
        headless: this.headless,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
        ],
      });

      this.logger.log('Browser started successfully');
      return this.browser;
    } catch (error) {
      this.logger.error(`Failed to start browser: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get the browser instance (starts it if not running)
   */
  async getBrowser(): Promise<Browser> {
    if (!this.browser || !this.browser.isConnected()) {
      return await this.startBrowser();
    }
    return this.browser;
  }

  /**
   * Create a new browser context
   * Multiple contexts can run concurrently
   */
  async createContext(options?: {
    userAgent?: string;
    viewport?: { width: number; height: number };
    locale?: string;
    timezoneId?: string;
  }): Promise<BrowserContext> {
    const browser = await this.getBrowser();
    const context = await browser.newContext(options);
    return context;
  }

  /**
   * Create a new page in a new context
   */
  async createPage(contextOptions?: {
    userAgent?: string;
    viewport?: { width: number; height: number };
    locale?: string;
    timezoneId?: string;
  }): Promise<Page> {
    const context = await this.createContext(contextOptions);
    return await context.newPage();
  }

  /**
   * Navigate to a URL and wait for the page to load
   */
  async navigateToPage(
    url: string,
    options?: {
      waitUntil?: 'load' | 'domcontentloaded' | 'networkidle';
      timeout?: number;
    },
  ): Promise<{ page: Page; context: BrowserContext }> {
    const context = await this.createContext();
    const page = await context.newPage();

    await page.goto(url, {
      waitUntil: options?.waitUntil || 'networkidle',
      timeout: options?.timeout || 30000,
    });

    return { page, context };
  }

  /**
   * Execute a function with a page and automatically cleanup
   * Each call creates a new context for isolation
   */
  async withPage<T>(
    fn: (page: Page) => Promise<T>,
    contextOptions?: {
      userAgent?: string;
      viewport?: { width: number; height: number };
    },
  ): Promise<T> {
    const context = await this.createContext(contextOptions);
    const page = await context.newPage();

    try {
      return await fn(page);
    } finally {
      try {
        await page.close();
      } catch (error) {
        this.logger.warn(`Error closing page: ${error.message}`);
      }
      try {
        await context.close();
      } catch (error) {
        this.logger.warn(`Error closing context: ${error.message}`);
      }
    }
  }

  /**
   * Disconnect from the browser and cleanup resources
   */
  async stopBrowser(): Promise<void> {
    try {
      if (this.browser) {
        this.logger.log('Closing browser...');
        await this.browser.close();
        this.browser = null;
        this.logger.log('Browser closed successfully');
      }
    } catch (error) {
      this.logger.error(`Error closing browser: ${error.message}`);
    }
  }

  /**
   * Cleanup on module destroy
   */
  async onModuleDestroy() {
    await this.stopBrowser();
  }

  /**
   * Check if browser is connected
   */
  isRunning(): boolean {
    return this.browser !== null && this.browser.isConnected();
  }
}
