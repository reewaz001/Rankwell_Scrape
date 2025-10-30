import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { PaperClubAPIService } from './services/paperclub-api.service';
import { DataTransformerService } from './services/data-transformer.service';
import { PaperClubScraperService } from './services/paperclub-scraper.service';
import { BQSCalculatorService } from '../../scoring/bqs-calculator.service';
import { DatabaseService } from '../../common/database.service';

/**
 * Paper.club Module
 *
 * Encapsulates all Paper.club scraping functionality including:
 * - API client
 * - Data transformation
 * - Scraping orchestration
 * - BQS scoring
 * - Database persistence
 */
@Module({
  imports: [HttpModule, ConfigModule],
  providers: [
    PaperClubAPIService,
    DataTransformerService,
    PaperClubScraperService,
    BQSCalculatorService,
    DatabaseService,
  ],
  exports: [
    PaperClubScraperService,
    PaperClubAPIService,
    DataTransformerService,
    DatabaseService,
  ],
})
export class PaperClubModule {}
