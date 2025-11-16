import { Injectable } from '@nestjs/common';
import { VocabularyBaseHandler } from './vocabulary-base.handler';
import { VocabularyType } from '../common/enum/vocabulary-type.enum';
import { NounData } from '../common/interface/vocabulary-data.interface';
import { HttpClientService } from './http-client.service';
import * as cheerio from 'cheerio';

/**
 * Handler for processing German nouns
 */
@Injectable()
export class NounHandler extends VocabularyBaseHandler {
  constructor(httpClientService: HttpClientService) {
    super(httpClientService);
  }

  /**
   * Determines if this handler can process the given vocabulary type
   * @param type - The vocabulary type to check
   * @returns true if type is NOUN
   */
  canHandle(type: VocabularyType): boolean {
    return type === VocabularyType.NOUN;
  }

  /**
   * Processes a German noun by fetching HTML and parsing it
   * @param word - The German noun to process
   * @returns Promise resolving to structured noun data
   */
  async process(word: string): Promise<NounData> {
    this.logger.log(`Processing noun: ${word}`);

    try {
      // Fetch HTML from dictionary website
      const html = await this.httpClientService.fetchWordHtml(word);

      // Parse the HTML response
      const nounData = this.parseHtmlResponse(html);

      this.logger.log(`Successfully processed noun: ${word}`);
      return nounData;
    } catch (error) {
      this.logger.error(
        `Error processing noun '${word}': ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Parses HTML response to extract noun-specific data
   * TODO: Implement HTML parsing logic
   * @param html - Raw HTML from dictionary website
   * @returns Structured noun data
   */
  parseHtmlResponse(html: string): NounData {
    this.logger.log('Parsing HTML for noun (stubbed implementation)');

    const $ = cheerio.load(html);

    // Extract the infinitive form (word)
    const infinitive = this.extractInfinitive($);

    // const stemForms = this.extractStemFormsFromTables($);

    // Extract translation
    const translation = this.extractTranslation($);

    // Extract example sentence
    const example = this.extractExample($);

    const plural = this.extractPlural($);

    const nounData: NounData = {
      word: infinitive,
      type: VocabularyType.NOUN,
      article: infinitive.split(' ')[0],
      plural: plural,
      translation: translation,
      example: example,
    };

    return nounData;
  }

  extractPlural($: cheerio.CheerioAPI): string {
    const paragraph = $('p.vStm.rCntr').first().text();
    if (!paragraph) {
      return 'plural not found';
    }

    // remove any "\n" characters
    return paragraph.replace(/\n/g, ' ').trim();
  }

  /**
   * Extracts the infinitive form from the HTML
   */
  extractInfinitive($: cheerio.CheerioAPI): string {
    // Look for the grundform (infinitive) - id="grundform"
    // const grundform = $('#grundform').text().trim();
    const span = $('span.vGrnd').first().text().trim();

    if (span) {
      return span;
    }

    // Fallback: try to get from h1
    const h1Text = $('h1').first().text();
    const match = h1Text.match(/laufen|(\w+)/);
    return match ? match[0] : 'unknown';
  }
}
