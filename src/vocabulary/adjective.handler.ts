import { Injectable } from '@nestjs/common';
import { VocabularyBaseHandler } from './vocabulary-base.handler';
import { VocabularyType } from '../common/enum/vocabulary-type.enum';
import { AdjectiveData } from '../common/interface/vocabulary-data.interface';
import { HttpClientService } from './http-client.service';
import * as cheerio from 'cheerio';

/**
 * Handler for processing German adjectives
 */
@Injectable()
export class AdjectiveHandler extends VocabularyBaseHandler {
  constructor(httpClientService: HttpClientService) {
    super(httpClientService);
  }

  canHandle(type: VocabularyType): boolean {
    return type === VocabularyType.ADJECTIVE;
  }

  parseHtmlResponse(html: string): AdjectiveData {
    this.logger.log('Parsing HTML for adjective');

    const $ = cheerio.load(html);

    const word = this.extractWord($);
    const comparison = this.extractComparison($);
    const declension = this.extractDeclension($);
    const translation = this.extractTranslation($);
    const example = this.extractExample($);

    const adjectiveData: AdjectiveData = {
      word,
      type: VocabularyType.ADJECTIVE,
      comparison,
      declension,
      translation,
      example,
    };

    return adjectiveData;
  }

  private extractWord($: cheerio.CheerioAPI): string {
    // Try to get from the basic form (Grundform)
    const grundform = $('#grundform').text().trim();
    if (grundform) {
      return grundform.replace(/\s+/g, '');
    }

    // Fallback: extract from the stem forms section
    const stemText = $('.vStm').first().find('b').first().text().trim();
    if (stemText) {
      return stemText;
    }

    // Last resort: get from h1
    const h1Text = $('h1').first().text();
    const match = h1Text.match(/\w+/);
    return match ? match[0] : 'unknown';
  }

  private extractComparison($: cheerio.CheerioAPI): {
    positive: string;
    comparative: string;
    superlative: string;
  } {
    // Extract from the stem forms paragraph (.vStm)
    const stemSection = $('.vStm').first();

    let positive = 'unknown';
    let comparative = 'unknown';
    let superlative = 'unknown';

    // Get the full text and split by the separator
    const fullText = stemSection.text();
    const parts = fullText.split('·').map((s) => s.trim());

    if (parts.length >= 3) {
      positive = parts[0].trim();
      comparative = parts[1].trim();
      // Remove 'am' prefix from superlative
      superlative = parts[2].replace(/^am\s+/, '').trim();
    } else {
      // Fallback: try to extract from individual bold elements
      const boldElements = stemSection.find('b');
      if (boldElements.length >= 1) {
        positive = $(boldElements[0]).text().trim();
      }
      if (boldElements.length >= 2) {
        comparative = $(boldElements[1]).text().trim();
      }
      if (boldElements.length >= 3) {
        superlative = $(boldElements[2]).text().trim();
      }
    }

    return { positive, comparative, superlative };
  }

  private extractDeclension($: cheerio.CheerioAPI): {
    strong: Record<string, string>;
    weak: Record<string, string>;
    mixed: Record<string, string>;
  } {
    const section = $(`.rBox.rBoxWht`);
    const declensionTables = section.find(`.vDkl`);
    const strong = this.extractDeclensionTable($, declensionTables.get(0));
    const weak = this.extractDeclensionTable($, declensionTables.get(1));
    const mixed = this.extractDeclensionTable($, declensionTables.get(2));

    return { strong, weak, mixed };
  }

  private extractDeclensionTable(
    $: cheerio.CheerioAPI,
    tableElement: any,
  ): Record<string, string> {
    const result: Record<string, string> = {};
    const cElement = $(tableElement);
    // Extract for each gender and plural
    const tables = cElement.find('.vTbl');

    if (tables.length === 0) {
      return result;
    }
    tables.each((i, table) => {
      const $table = $(table);
      const headerElement = $table.find('h2, h3').first();
      const header = headerElement.text().trim().toLowerCase();

      // Determine the gender/plural key
      let prefix = '';
      if (header.includes('masculine') || header.includes('masc')) {
        prefix = 'masculine';
      } else if (header.includes('feminine') || header.includes('fem')) {
        prefix = 'feminine';
      } else if (header.includes('neutral') || header.includes('neut')) {
        prefix = 'neutral';
      } else if (header.includes('plural')) {
        prefix = 'plural';
      }

      if (!prefix) return;

      // Extract the rows from the actual table element
      const tableElement = $table.find('table');
      tableElement.find('tr').each((j, row) => {
        const $row = $(row);
        const thElement = $row.find('th').first();
        const tdElements = $row.find('td');

        // Get the case from the title attribute or text
        const caseLabel =
          thElement.attr('title')?.toLowerCase().replace('.', '') ||
          thElement.text().trim().toLowerCase().replace('.', '');

        // For strong declension, there's only one td with the value
        // For weak/mixed, there might be multiple tds (article + adjective)
        let value = '';
        if (tdElements.length === 1) {
          // Strong declension: just the adjective
          value = tdElements.eq(0).text().trim();
        } else if (tdElements.length > 1) {
          // Weak/mixed declension: last td is the adjective
          value = tdElements.last().text().trim();
        }

        if (caseLabel && value) {
          // Normalize case labels
          let normalizedCase = caseLabel;
          if (caseLabel.includes('nom')) normalizedCase = 'nominative';
          else if (caseLabel.includes('gen')) normalizedCase = 'genitive';
          else if (caseLabel.includes('dat')) normalizedCase = 'dative';
          else if (caseLabel.includes('acc')) normalizedCase = 'accusative';

          result[`${prefix}_${normalizedCase}`] = value;
        }
      });
    });

    return result;
  }
}
