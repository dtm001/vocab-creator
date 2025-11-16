import { Injectable } from '@nestjs/common';
import { VocabularyBaseHandler } from './vocabulary-base.handler';
import { VocabularyType } from '../common/enum/vocabulary-type.enum';
import { VerbData } from '../common/interface/vocabulary-data.interface';
import { HttpClientService } from './http-client.service';
import * as cheerio from 'cheerio';

/**
 * Handler for processing German verbs
 */
@Injectable()
export class VerbHandler extends VocabularyBaseHandler {
  constructor(httpClientService: HttpClientService) {
    super(httpClientService);
  }

  /**
   * Determines if this handler can process the given vocabulary type
   * @param type - The vocabulary type to check
   * @returns true if type is VERB
   */
  canHandle(type: VocabularyType): boolean {
    return type === VocabularyType.VERB;
  }

  /**
   * Processes a German verb by fetching HTML and parsing it
   * @param word - The German verb to process
   * @returns Promise resolving to structured verb data
   */
  async process(word: string): Promise<VerbData> {
    this.logger.log(`Processing verb: ${word}`);

    try {
      // Fetch HTML from dictionary website
      const html = await this.httpClientService.fetchWordHtml(word);

      // Parse the HTML response
      const verbData = this.parseHtmlResponse(html);

      this.logger.log(`Successfully processed verb: ${word}`);
      return verbData;
    } catch (error) {
      this.logger.error(
        `Error processing verb '${word}': ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Parses HTML response to extract verb-specific data
   * @param html - Raw HTML from dictionary website
   * @returns Structured verb data
   */
  parseHtmlResponse(html: string): VerbData {
    this.logger.log('Parsing HTML for verb');

    const $ = cheerio.load(html);

    // Extract the infinitive form (word)
    const infinitive = this.extractInfinitive($);

    // Extract stem forms (3rd person present, simple past, perfect)
    const stemForms = this.extractStemFormsFromTables($);

    // Extract translation
    const translation = this.extractTranslation($);

    // Extract example sentence
    const example = this.extractExample($);

    const verbData: VerbData = {
      word: infinitive,
      type: VocabularyType.VERB,
      conjugations: stemForms.conjugations,
      simplePast: stemForms.simplePast,
      perfekt: stemForms.perfekt,
      translation: translation,
      example: example,
    };

    return verbData;
  }

  /**
   * Extracts the infinitive form from the HTML
   */
  extractInfinitive($: cheerio.CheerioAPI): string {
    // Look for the grundform (infinitive) - id="grundform"
    const grundform = $('#grundform').text().trim();

    if (grundform) {
      // Remove any extra whitespace and return clean word
      return grundform.replace(/\s+/g, '');
    }

    // Fallback: try to get from h1
    const h1Text = $('h1').first().text();
    const match = h1Text.match(/laufen|(\w+)/);
    return match ? match[0] : 'unknown';
  }

  /**
   * Fallback method to extract stem forms from conjugation tables
   */
  private extractStemFormsFromTables($: cheerio.CheerioAPI): {
    conjugations: {
      ich: string;
      du: string;
      er: string;
      wir: string;
      ihr: string;
      sie: string;
    };
    simplePast: string;
    perfekt: string;
  } {
    let conjugations = {
      ich: '',
      du: '',
      er: '',
      wir: '',
      ihr: '',
      sie: '',
    };
    let simplePast = 'unknown';
    let perfekt = 'unknown';

    // Find Present tense table and get 3rd person (er/sie/es row)
    $('h2:contains("Present"), h3:contains("Present")').each((i, elem) => {
      const table = $(elem).parent().find('table').first();
      const erRow = table.find('tr').map((i, row) => {
        const key = $(row).find('td').first().text().trim();
        if (key in conjugations) {
          return row;
        }
      });
      if (erRow.length) {
        erRow.each((i, row) => {
          const key = $(row).find('td').first().text().trim();
          const value = $(row).find('td').eq(1).text().trim();
          if (key in conjugations) {
            conjugations[key as keyof typeof conjugations] = value;
          }
        });
      }
    });

    // Find Imperfect table and get simple past (ich form)
    $('h2:contains("Imperfect"), h3:contains("Imperfect")').each((i, elem) => {
      const table = $(elem).parent().find('table').first();
      const ichRow = table.find('tr').first();
      if (ichRow.length) {
        simplePast = ichRow.find('td').eq(1).text().trim();
      }
    });

    // Find Perfect table and get perfekt form
    $('h2:contains("Perfect"), h3:contains("Perfect")').each((i, elem) => {
      const table = $(elem).parent().find('table').first();
      const ichRow = table.find('tr').first();
      if (ichRow.length) {
        const cells = ichRow.find('td');
        // Perfect form is typically "auxiliary + participle"
        perfekt = cells
          .slice(1)
          .map((i, td) => $(td).text().trim())
          .get()
          .join(' ');
      }
    });

    return { conjugations, simplePast, perfekt };
  }
}
