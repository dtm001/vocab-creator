import { Module } from '@nestjs/common';
import { FlashcardController } from './flashcard.controller';
import { FlashcardProcessingService } from './flashcard-processor.service';
import { CsvModule } from '../csv/csv.module';
import { VocabularyModule } from '../vocabulary/vocabulary.module';

/**
 * Module for flashcard processing functionality
 */
@Module({
  imports: [CsvModule, VocabularyModule],
  controllers: [FlashcardController],
  providers: [FlashcardProcessingService],
})
export class FlashcardModule {}
