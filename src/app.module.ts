import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PaperClubModule } from './modules/paperclub/paperclub.module';

/**
 * Main Application Module
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PaperClubModule,
  ],
})
export class AppModule {}
