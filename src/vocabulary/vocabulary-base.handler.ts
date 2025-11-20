import { Injectable, Logger } from '@nestjs/common';
import { IVocabularyHandler } from './interface/vocabulary-handler.interface';
import { VocabularyType } from '../common/enum/vocabulary-type.enum';
import { VocabularyData } from '../common/interface/vocabulary-data.interface';
import { HttpClientService } from './http-client.service';
import * as cheerio from 'cheerio';

/**
 * Abstract base class for vocabulary handlers
 * Provides common functionality for fetching and processing vocabulary data
 */
@Injectable()
export abstract class VocabularyBaseHandler implements IVocabularyHandler {
  protected readonly logger: Logger;

  constructor(protected readonly httpClientService: HttpClientService) {
    this.logger = new Logger(this.constructor.name);
  }

  /**
   * Abstract method to determine if handler supports a vocabulary type
   */
  abstract canHandle(type: VocabularyType): boolean;

  /**
   * Abstract method to parse HTML response
   */
  abstract parseHtmlResponse(html: string): VocabularyData;

  /**
   * Processes a German word by fetching HTML and parsing it
   * @param word - The German word to process
   * @returns Promise resolving to structured vocabulary data
   */
  async process(word: string, html: string): Promise<VocabularyData> {
    this.logger.log(`Processing word: ${word}`);

    try {
      // Parse the HTML response
      const vocabularyData = this.parseHtmlResponse(html);

      this.logger.log(`Successfully processed word: ${word}`);
      return vocabularyData;
    } catch (error) {
      this.logger.error(
        `Error processing word '${word}': ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Extracts English translation from the HTML
   */
  extractTranslation($: cheerio.CheerioAPI): string {
    // Look for English translation in the language section
    const translations: string[] = [];

    // Find all spans with lang="en" attribute
    $('span[lang="en"]').each((i, elem) => {
      const text = $(elem).text().trim();
      if (text) {
        translations.push(text);
      }
    });

    if (translations.length > 0) {
      // Return first translation or combine multiple
      return translations[0];
    }

    // Fallback: look for translation in definition area
    const defText = $('.vStckInf, #vStckInf').text();
    const enMatch = defText.match(/🇬🇧\s*([^🇩]+)/);
    if (enMatch) {
      return enMatch[1].trim();
    }

    return 'translation not found';
  }

  /**
   * Extracts example sentence from the HTML
   */
  extractExample($: cheerio.CheerioAPI): string[] {
    // Look for example sentences - they typically contain <q> tags
    let examples: string[] = [];

    // Find example sentences in the examples section
    $('ul.rLstGt li').each((i, elem) => {
      const text = $(elem).text().trim();
      // Filter for sentences in German (usually contain conjugated verb)
      if (text && text.length > 10 && text.length < 200) {
        // Extract just the German sentence (before translation)
        const parts = text.split(/🇬🇧|English:/);
        if (parts[0]) {
          examples.push(parts[0].trim());
        }
      }
    });

    // Filter examples to ensure they contain multiple newlines (indicating includes translation)
    examples = examples.filter((ex) => ex.includes('\n\n\n\n\n'));

    if (examples.length > 0) {
      return examples.map((ex) => ex.replace(/\n+/g, ' ').trim());
    }

    // Fallback: look in the note section
    const noteText = $('.rInf.rNt').text();
    if (noteText && noteText.includes('»')) {
      const match = noteText.match(/»\s*([^.!?]+[.!?])/);
      if (match) {
        return [match[1].trim()];
      }
    }

    return ['example not found'];
  }
}
