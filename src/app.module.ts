import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PaperClubModule } from './modules/paperclub/paperclub.module';
import { RocketLinksModule } from './modules/rocketlinks/rocketlinks.module';

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
    RocketLinksModule,
  ],
})
export class AppModule {}
