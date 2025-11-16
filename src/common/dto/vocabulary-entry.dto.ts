import { VocabularyType } from '../enum/vocabulary-type.enum';

/**
 * Data Transfer Object representing a single vocabulary entry from CSV
 */
export interface VocabularyEntryDto {
  /**
   * The type of vocabulary (verb or noun)
   */
  type: VocabularyType;

  /**
   * The German word to process
   */
  word: string;

  /**
   * Optional row number for tracking and error reporting
   */
  rowNumber?: number;
}
