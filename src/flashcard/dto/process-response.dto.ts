import { VocabularyData } from '../../common/interface/vocabulary-data.interface';

/**
 * Response DTO for a single processed entry
 */
export class ProcessedEntryDto {
  word: string;
  type: string;
  rowNumber?: number;
  success: boolean;
  skipped?: boolean;
  reason?: string;
  data?: VocabularyData;
  error?: string;
}

/**
 * Response DTO for the entire processing operation
 */
export class ProcessResponseDto {
  success: boolean;
  message: string;
  summary: {
    totalRows: number;
    successCount: number;
    failureCount: number;
    skippedCount: number;
    processingTimeMs: number;
  };
  results: ProcessedEntryDto[];
}
