import { Module } from '@nestjs/common';
import { CliService } from './cli.service';
import { FlashcardModule } from '../flashcard/flashcard.module';
import { DatabaseModule } from '../database/database.module';
import { PackService } from '../database/services/pack.service';
import { DeckService } from '../database/services/deck.service';
import { CardService } from '../database/services/card.service';

/**
 * Module for CLI functionality
 */
@Module({
  imports: [FlashcardModule, DatabaseModule],
  providers: [CliService, PackService, DeckService, CardService],
  exports: [CliService],
})
export class CliModule {}
