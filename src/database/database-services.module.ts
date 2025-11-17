import { Module } from '@nestjs/common';
import { PackService } from './services/pack.service';
import { DeckService } from './services/deck.service';
import { CardService } from './services/card.service';
import { DatabaseModule } from './database.module';

/**
 * Module for database services
 */
@Module({
  imports: [DatabaseModule],
  providers: [PackService, DeckService, CardService],
  exports: [PackService, DeckService, CardService],
})
export class DatabaseServicesModule {}
