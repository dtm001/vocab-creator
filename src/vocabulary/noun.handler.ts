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

  canHandle(type: VocabularyType): boolean {
    return type === VocabularyType.NOUN;
  }

  parseHtmlResponse(html: string): NounData {
    this.logger.log('Parsing HTML for noun');

    const $ = cheerio.load(html);

    const fullWord = this.extractFullWord($);
    const plural = this.extractPlural($);
    const translation = this.extractTranslation($); // Using base class method
    const example = this.extractExample($); // Using base class method

    // Split article from word (e.g., "das Haus" -> article: "das", word: "Haus")
    const parts = fullWord.split(' ');
    const article = parts.length > 1 ? parts[0] : 'article not found';
    const word = parts.length > 1 ? parts.slice(1).join(' ') : fullWord;

    const nounData: NounData = {
      word: word,
      type: VocabularyType.NOUN,
      article: article,
      plural: plural,
      translation: translation,
      example: example,
    };

    return nounData;
  }

  private extractFullWord($: cheerio.CheerioAPI): string {
    const span = $('span.vGrnd').first().text().trim();

    if (span) {
      return span;
    }

    // Fallback: try to get from h1
    const h1Text = $('h1').first().text();
    const match = h1Text.match(/\w+/);
    return match ? match[0] : 'unknown';
  }

  private extractPlural($: cheerio.CheerioAPI): string {
    const paragraph = $('p.vStm.rCntr').first().text();

    if (!paragraph) {
      return 'plural not found';
    }

    // Clean up whitespace and newlines
    return paragraph.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
  }
}
