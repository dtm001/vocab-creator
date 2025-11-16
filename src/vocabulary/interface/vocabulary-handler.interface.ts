import { VocabularyType } from 'src/common/enum/vocabulary-type.enum';
import { VocabularyData } from 'src/common/interface/vocabulary-data.interface';

/**
 * Interface for vocabulary handlers that process different types of German words
 * Implementations should handle specific vocabulary types (verbs, nouns, etc.)
 */
export interface IVocabularyHandler {
  /**
   * Determines if this handler can process the given vocabulary type
   * @param type - The vocabulary type to check
   * @returns true if this handler can process the type, false otherwise
   */
  canHandle(type: VocabularyType): boolean;

  /**
   * Processes a German word by fetching and parsing data from the dictionary website
   * @param word - The German word to process
   * @returns Promise resolving to structured vocabulary data
   */
  process(word: string): Promise<VocabularyData>;

  /**
   * Parses HTML response from the dictionary website
   * Implementation will be added later when we handle HTML parsing
   * @param html - Raw HTML string from the dictionary website
   * @returns Structured vocabulary data extracted from HTML
   */
  parseHtmlResponse(html: string): VocabularyData;
}
