import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CsvModule } from './csv/csv.module';
import { VocabularyModule } from './vocabulary/vocabulary.module';
import { FlashcardModule } from './flashcard/flashcard.module';
import { DatabaseModule } from './database/database.module';
import { DatabaseServicesModule } from './database/database-services.module';
import { ProvidersModule } from './providers/provider.module';
import { ContextModule } from './context/context.module';

@Module({
  imports: [
    CsvModule,
    VocabularyModule,
    FlashcardModule,
    DatabaseModule,
    DatabaseServicesModule,
    ProvidersModule,
    ContextModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
