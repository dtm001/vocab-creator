import { Module } from '@nestjs/common';
import { FlashcardController } from './flashcard.controller';
import { CsvModule } from '../csv/csv.module';
import { VocabularyModule } from '../vocabulary/vocabulary.module';
import { PackService } from '../database/services/pack.service';
import { DeckService } from '../database/services/deck.service';
import { CardService } from '../database/services/card.service';
import { DatabaseModule } from '../database/database.module';
import { FlashcardProcessingService } from './flashcard-processor.service';
import { VocabularyToCardMapper } from '../mappers/vocabulary-to-card.mapper';

/**
 * Module for flashcard processing functionality
 */
@Module({
  imports: [CsvModule, VocabularyModule, DatabaseModule],
  controllers: [FlashcardController],
  providers: [
    FlashcardProcessingService,
    VocabularyToCardMapper,
    PackService,
    DeckService,
    CardService,
  ],
  exports: [FlashcardProcessingService, PackService, DeckService, CardService],
})
export class FlashcardModule {}
