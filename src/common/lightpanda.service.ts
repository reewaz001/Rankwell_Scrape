import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Browser, BrowserContext, Page } from 'playwright';
import { chromium } from 'playwright-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

// Apply stealth plugin to chromium
chromium.use(StealthPlugin());

/**
 * Browser Service (Playwright Chromium with Advanced Stealth)
 *
 * Provides a local Playwright Chromium browser instance with advanced anti-bot detection bypassing.
 * Works on all platforms: Windows, Mac, and Linux.
 *
 * Features:
 * - Playwright-extra with stealth plugin for advanced bot detection bypassing
 * - Multiple concurrent contexts supported
 * - Automatic cleanup on module destroy
 * - Browser context and page creation utilities
 * - Headless mode for better performance
 * - Human-like behavior simulation (random delays, mouse movements)
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
   * Start Playwright Chromium browser with advanced anti-bot detection bypassing
   */
  async startBrowser(): Promise<Browser> {
    if (this.browser && this.browser.isConnected()) {
      this.logger.debug('Browser already running, reusing existing instance');
      return this.browser;
    }

    try {
      this.logger.log('Starting Playwright Chromium browser with advanced stealth mode...');

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
          // Anti-bot detection arguments
          '--disable-blink-features=AutomationControlled',
          '--disable-features=IsolateOrigins,site-per-process',
          '--disable-web-security',
          '--window-size=1920,1080',
          // Additional stealth arguments
          '--disable-infobars',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
        ],
      });

      this.logger.log('Browser started successfully with advanced stealth features');
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
   * Create a new browser context with anti-bot detection
   * Multiple contexts can run concurrently
   */
  async createContext(options?: {
    userAgent?: string;
    viewport?: { width: number; height: number };
    locale?: string;
    timezoneId?: string;
  }): Promise<BrowserContext> {
    const browser = await this.getBrowser();

    // Default realistic browser configuration
    const contextOptions = {
      userAgent: options?.userAgent ||
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: options?.viewport || { width: 1920, height: 1080 },
      locale: options?.locale || 'fr-FR',
      timezoneId: options?.timezoneId || 'Europe/Paris',
      // Additional anti-bot features
      extraHTTPHeaders: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Cache-Control': 'max-age=0',
      },
    };

    const context = await browser.newContext(contextOptions);

    // Add script to mask automation
    await context.addInitScript(() => {
      // Remove webdriver property
      Object.defineProperty(navigator, 'webdriver', {
        get: () => false,
      });

      // Mock chrome object
      (window as any).chrome = {
        runtime: {},
      };

      // Mock permissions
      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (parameters: any) => (
        parameters.name === 'notifications' ?
          Promise.resolve({ state: Notification.permission } as PermissionStatus) :
          originalQuery(parameters)
      );

      // Mock plugins
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5],
      });

      // Mock languages
      Object.defineProperty(navigator, 'languages', {
        get: () => ['fr-FR', 'fr', 'en-US', 'en'],
      });
    });

    return context;
  }

  /**
   * Add human-like behavior to a page (random delays, mouse movements)
   */
  async simulateHumanBehavior(page: Page): Promise<void> {
    try {
      // Random delay before interaction (1-3 seconds)
      const initialDelay = Math.floor(Math.random() * 2000) + 1000;
      await page.waitForTimeout(initialDelay);

      // Random mouse movements
      const viewport = page.viewportSize();
      if (viewport) {
        for (let i = 0; i < 3; i++) {
          const x = Math.floor(Math.random() * viewport.width);
          const y = Math.floor(Math.random() * viewport.height);
          await page.mouse.move(x, y, { steps: 10 });
          await page.waitForTimeout(Math.floor(Math.random() * 500) + 200);
        }
      }

      // Random scroll
      await page.evaluate(() => {
        window.scrollBy(0, Math.floor(Math.random() * 300) + 100);
      });
      await page.waitForTimeout(Math.floor(Math.random() * 500) + 300);

    } catch (error) {
      this.logger.warn(`Error simulating human behavior: ${error.message}`);
    }
  }

  /**
   * Navigate to URL with human-like behavior
   */
  async navigateWithStealth(
    page: Page,
    url: string,
    options?: {
      waitUntil?: 'load' | 'domcontentloaded' | 'networkidle';
      timeout?: number;
    },
  ): Promise<void> {
    // Navigate to page
    await page.goto(url, {
      waitUntil: options?.waitUntil || 'networkidle',
      timeout: options?.timeout || 30000,
    });

    // Simulate human behavior after page load
    await this.simulateHumanBehavior(page);
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
