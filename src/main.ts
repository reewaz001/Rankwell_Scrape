import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';

/**
 * Bootstrap the NestJS application
 */
async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'error', 'warn', 'debug'],
  });

  logger.log('Rankwell Paper.club Scraper initialized');

  return app;
}

// Only bootstrap if run directly (not imported)
if (require.main === module) {
  bootstrap()
    .then((app) => {
      console.log('Application ready. Use CLI scripts to run scrapers.');
    })
    .catch((error) => {
      console.error('Application failed to start:', error);
      process.exit(1);
    });
}

export { bootstrap };
