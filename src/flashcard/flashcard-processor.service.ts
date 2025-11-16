import { Injectable, Logger } from '@nestjs/common';
import { CsvService } from '../csv/csv.service';
import { VocabularyHandlerFactory } from '../vocabulary/vocabulary-handler.factory';
import { VocabularyData } from '../common/interface/vocabulary-data.interface';
import { VocabularyEntryDto } from '../common/dto/vocabulary-entry.dto';

/**
 * Result of processing a single vocabulary entry
 */
export interface ProcessingResult {
  entry: VocabularyEntryDto;
  data?: VocabularyData;
  success: boolean;
  error?: string;
}

/**
 * Summary of the entire processing job
 */
export interface ProcessingSummary {
  totalRows: number;
  successCount: number;
  failureCount: number;
  results: ProcessingResult[];
  processingTimeMs: number;
}

/**
 * Service that orchestrates the flashcard creation workflow
 */
@Injectable()
export class FlashcardProcessingService {
  private readonly logger = new Logger(FlashcardProcessingService.name);

  constructor(
    private readonly csvService: CsvService,
    private readonly handlerFactory: VocabularyHandlerFactory,
  ) {}

  /**
   * Processes a CSV file and creates flashcard data for all entries
   * @param csvPath - Path to the CSV file
   * @returns Promise resolving to processing summary
   */
  async processFile(csvPath: string): Promise<ProcessingSummary> {
    const startTime = Date.now();
    this.logger.log(`Starting flashcard processing for file: ${csvPath}`);

    // Read and validate CSV file
    const entries = await this.csvService.readCsv(csvPath);
    this.logger.log(`Found ${entries.length} entries to process`);

    // Process each entry
    const results: ProcessingResult[] = [];
    let successCount = 0;
    let failureCount = 0;

    for (const entry of entries) {
      const result = await this.processEntry(entry);
      results.push(result);

      if (result.success) {
        successCount++;
      } else {
        failureCount++;
      }

      // Log progress
      this.logger.log(
        `Progress: ${results.length}/${entries.length} (${successCount} succeeded, ${failureCount} failed)`,
      );
    }

    const processingTimeMs = Date.now() - startTime;

    const summary: ProcessingSummary = {
      totalRows: entries.length,
      successCount,
      failureCount,
      results,
      processingTimeMs,
    };

    this.logger.log(
      `Completed processing: ${successCount}/${entries.length} succeeded in ${processingTimeMs}ms`,
    );

    return summary;
  }

  /**
   * Processes a single vocabulary entry
   * @param entry - Vocabulary entry to process
   * @returns Promise resolving to processing result
   */
  private async processEntry(
    entry: VocabularyEntryDto,
  ): Promise<ProcessingResult> {
    this.logger.debug(`Processing entry: ${entry.word} (${entry.type})`);

    try {
      // Get appropriate handler for this vocabulary type
      const handler = this.handlerFactory.getHandler(entry.type);

      // Process the word
      const data = await handler.process(entry.word);

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
   * @param batchSize - Number of entries to process concurrently
   */
  private async processBatch(
    entries: VocabularyEntryDto[],
    batchSize: number = 5,
  ): Promise<ProcessingResult[]> {
    const results: ProcessingResult[] = [];

    for (let i = 0; i < entries.length; i += batchSize) {
      const batch = entries.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map((entry) => this.processEntry(entry)),
      );
      results.push(...batchResults);
    }

    return results;
  }
}
