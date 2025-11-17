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

  canHandle(type: VocabularyType): boolean {
    return type === VocabularyType.VERB;
  }

  parseHtmlResponse(html: string): VerbData {
    this.logger.log('Parsing HTML for verb');

    const $ = cheerio.load(html);

    const infinitive = this.extractInfinitive($);
    const stemForms = this.extractStemFormsFromTables($);
    const translation = this.extractTranslation($); // Using base class method
    const example = this.extractExample($); // Using base class method

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

  private extractInfinitive($: cheerio.CheerioAPI): string {
    const grundform = $('#grundform').text().trim();

    if (grundform) {
      return grundform.replace(/\s+/g, '');
    }

    const h1Text = $('h1').first().text();
    const match = h1Text.match(/\w+/);
    return match ? match[0] : 'unknown';
  }

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
    const conjugations = {
      ich: '',
      du: '',
      er: '',
      wir: '',
      ihr: '',
      sie: '',
    };
    let simplePast = 'unknown';
    let perfekt = 'unknown';

    // Find Present tense table
    $('h2:contains("Present"), h3:contains("Present")').each((i, elem) => {
      const table = $(elem).parent().find('table').first();
      table.find('tr').each((i, row) => {
        const key = $(row).find('td').first().text().trim();
        const value = $(row).find('td').eq(1).text().trim();
        if (key in conjugations && value) {
          conjugations[key as keyof typeof conjugations] = value;
        }
      });
    });

    // Find Imperfect table
    $('h2:contains("Imperfect"), h3:contains("Imperfect")').each((i, elem) => {
      const table = $(elem).parent().find('table').first();
      const ichRow = table.find('tr').first();
      if (ichRow.length) {
        simplePast = ichRow.find('td').eq(1).text().trim();
      }
    });

    // Find Perfect table
    $('h2:contains("Perfect"), h3:contains("Perfect")').each((i, elem) => {
      const table = $(elem).parent().find('table').first();
      const ichRow = table.find('tr').first();
      if (ichRow.length) {
        const cells = ichRow.find('td');
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
