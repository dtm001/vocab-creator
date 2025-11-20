import { Injectable, Logger } from '@nestjs/common';
import { CsvService } from '../csv/csv.service';
import { VocabularyHandlerFactory } from '../vocabulary/vocabulary-handler.factory';
import { VocabularyData } from '../common/interface/vocabulary-data.interface';
import { VocabularyEntryDto } from '../common/dto/vocabulary-entry.dto';
import { CardService } from '../database/services/card.service';
import { VocabularyToCardMapper } from '../mappers/vocabulary-to-card.mapper';
import { ContextService } from '../context/context.service';
import { ProviderFactory } from '../providers/provider.factory';
import { IFlashcardProvider } from '../providers/interfaces/flashcard-provider.interface';
import { VocabularyTypeService } from '../vocabulary/vocabulary-type.service';
import { HttpClientService } from '../vocabulary/http-client.service';
import { VocabularyType } from '../common/enum/vocabulary-type.enum';

/**
 * Result of processing a single vocabulary entry
 */
export interface ProcessingResult {
  entry: VocabularyEntryDto;
  data?: VocabularyData;
  success: boolean;
  error?: string;
  skipped?: boolean;
  reason?: string;
}

/**
 * Summary of the entire processing job
 */
export interface ProcessingSummary {
  totalRows: number;
  successCount: number;
  failureCount: number;
  skippedCount: number;
  results: ProcessingResult[];
  processingTimeMs: number;
}

/**
 * Service that orchestrates the flashcard creation workflow
 */
@Injectable()
export class FlashcardProcessingService {
  private readonly logger = new Logger(FlashcardProcessingService.name);
  private selectedProvider: IFlashcardProvider | null = null;

  constructor(
    private readonly csvService: CsvService,
    private readonly httpClientService: HttpClientService,
    private readonly handlerFactory: VocabularyHandlerFactory,
    private readonly cardService: CardService,
    private readonly vocabularyMapper: VocabularyToCardMapper,
    private readonly contextService: ContextService,
    private readonly providerFactory: ProviderFactory,
    private readonly typeService: VocabularyTypeService,
  ) {}

  /**
   * Processes a CSV file and creates flashcard data for all entries
   * @param csvPath - Path to the CSV file
   * @param deckId - Target deck ID to save cards to
   * @returns Promise resolving to processing summary
   */
  async processFile(
    csvPath: string,
    packId: string,
    deckId: string,
  ): Promise<ProcessingSummary> {
    const startTime = Date.now();
    this.logger.log(`Starting flashcard processing for file: ${csvPath}`);

    // Read and validate CSV file
    const entries = await this.csvService.readCsv(csvPath);
    this.logger.log(`Found ${entries.length} entries to process`);

    // Get existing words in the deck to skip duplicates
    const existingWords = await this.cardService.getExistingNamesInDeck(deckId);
    this.logger.log(`Found ${existingWords.size} existing cards in deck`);

    // Process each entry
    const results: ProcessingResult[] = [];
    let successCount = 0;
    let failureCount = 0;
    let skippedCount = 0;

    for (const entry of entries) {
      // Check if word already exists
      if (existingWords.has(entry.word)) {
        this.logger.log(`Skipping duplicate word: ${entry.word}`);
        results.push({
          entry,
          success: true,
          skipped: true,
          reason: 'Word already exists in deck',
        });
        skippedCount++;
        continue;
      }

      const result = await this.processEntry(entry, packId, deckId);
      results.push(result);

      if (result.success && !result.skipped) {
        successCount++;
      } else if (!result.success) {
        failureCount++;
      }

      // Log progress
      this.logger.log(
        `Progress: ${results.length}/${entries.length} (${successCount} new, ${skippedCount} skipped, ${failureCount} failed)`,
      );
    }

    const processingTimeMs = Date.now() - startTime;

    const summary: ProcessingSummary = {
      totalRows: entries.length,
      successCount,
      failureCount,
      skippedCount,
      results,
      processingTimeMs,
    };

    this.logger.log(
      `Completed processing: ${successCount} new cards, ${skippedCount} skipped, ${failureCount} failed in ${processingTimeMs}ms`,
    );

    return summary;
  }

  /**
   * Processes a single vocabulary entry and saves it to the database
   * @param entry - Vocabulary entry to process
   * @param deckId - Target deck ID
   * @returns Promise resolving to processing result
   */
  private async processEntry(
    entry: VocabularyEntryDto,
    packId: string,
    deckId: string,
  ): Promise<ProcessingResult> {
    this.logger.debug(`Processing entry: ${entry.word} (${entry.type})`);

    try {
      const html = await this.httpClientService.fetchWordHtml(entry.word);
      // determine type
      const wordType =
        entry.type !== VocabularyType.UNSET
          ? entry.type
          : this.typeService.determineWordType(html);

      // Get appropriate handler for this vocabulary type
      const handler = this.handlerFactory.getHandler(wordType);

      // Process the word (fetch HTML and parse)
      const data = await handler.process(entry.word, html);

      // Map vocabulary data to card format
      const cardData = this.vocabularyMapper.mapToCard(data, deckId);

      // Save card to database
      const providerType = this.contextService.get('provider') as string;
      this.selectedProvider = this.providerFactory.getProvider(providerType);
      const providerCard = await this.selectedProvider.createCard(
        packId,
        deckId,
        cardData,
      );
      await this.cardService.create({ ...cardData, id: providerCard.id });

      this.logger.log(`Successfully saved card: ${entry.word}`);

      return {
        entry,
        data,
        success: true,
      };
    } catch (error) {
      this.logger.error(
        `Failed to process entry '${entry.word}' at row ${entry.rowNumber}: ${error.message}`,
        error.stack,
      );

      return {
        entry,
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Processes entries in batches for better performance
   * Alternative implementation for future use
   * @param entries - Array of entries to process
   * @param deckId - Target deck ID
   * @param batchSize - Number of entries to process concurrently
   */
  private async processBatch(
    entries: VocabularyEntryDto[],
    packId: string,
    deckId: string,
    batchSize: number = 5,
  ): Promise<ProcessingResult[]> {
    const results: ProcessingResult[] = [];

    for (let i = 0; i < entries.length; i += batchSize) {
      const batch = entries.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map((entry) => this.processEntry(entry, packId, deckId)),
      );
      results.push(...batchResults);
    }

    return results;
  }
}
