import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CsvModule } from './csv/csv.module';
import { VocabularyModule } from './vocabulary/vocabulary.module';
import { FlashcardModule } from './flashcard/flashcard.module';

@Module({
  imports: [CsvModule, VocabularyModule, FlashcardModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
