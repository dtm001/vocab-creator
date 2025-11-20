import { Injectable } from '@nestjs/common';
import { VocabularyBaseHandler } from './vocabulary-base.handler';
import { VocabularyType } from '../common/enum/vocabulary-type.enum';
import {
  DefaultData,
  VocabularyData,
} from '../common/interface/vocabulary-data.interface';
import { HttpClientService } from './http-client.service';
import * as cheerio from 'cheerio';

/**
 * Default handler for unknown vocabulary types
 * Extracts basic information: word, translation, and examples
 */
@Injectable()
export class DefaultHandler extends VocabularyBaseHandler {
  constructor(httpClientService: HttpClientService) {
    super(httpClientService);
  }

  canHandle(type: VocabularyType): boolean {
    return type === VocabularyType.UNSET;
  }

  parseHtmlResponse(html: string): DefaultData {
    this.logger.log('Parsing HTML with default handler');

    const $ = cheerio.load(html);

    const word = this.extractWord($);
    const translation = this.extractTranslation($);
    const example = this.extractExample($);

    const vocabularyData: DefaultData = {
      word,
      type: VocabularyType.UNSET,
      translation,
      example,
    };

    return vocabularyData;
  }

  private extractWord($: cheerio.CheerioAPI): string {
    // Try multiple strategies to find the word

    // 1. Look for grundform element
    const grundform = $('#grundform').text().trim();
    if (grundform) {
      return grundform.replace(/\s+/g, '');
    }

    // 2. Look in the main stem/word display area
    const mainWord = $('.vGrnd b, .vStm b').first().text().trim();
    if (mainWord) {
      return mainWord;
    }

    // 3. Extract from the page title
    const title = $('title').text();
    const titleMatch = title.match(/[""]([^""]+)[""]|"([^"]+)"/);
    if (titleMatch) {
      return titleMatch[1] || titleMatch[2];
    }

    // 4. Try to get from h1
    const h1Text = $('h1').first().text();
    const h1Match = h1Text.match(/\b[a-zäöüß]+\b/i);
    if (h1Match) {
      return h1Match[0];
    }

    // 5. Look for the input value in the search form
    const inputValue = $('input[name="w"]').val();
    if (inputValue && typeof inputValue === 'string') {
      return inputValue.trim();
    }

    return 'unknown';
  }

  private detectType($: cheerio.CheerioAPI): VocabularyType | null {
    // Try to detect the vocabulary type from the page content
    const pageText = $('body').text().toLowerCase();

    // Look for type indicators in the info section
    const infoSection = $('#vStckInf, .vStckInf').text().toLowerCase();

    if (
      infoSection.includes('verb') ||
      pageText.includes('conjugation') ||
      pageText.includes('konjugation')
    ) {
      return VocabularyType.VERB;
    }

    if (
      infoSection.includes('adjective') ||
      infoSection.includes('adjektiv') ||
      pageText.includes('declension') ||
      pageText.includes('deklination')
    ) {
      return VocabularyType.ADJECTIVE;
    }

    if (
      infoSection.includes('noun') ||
      infoSection.includes('substantiv') ||
      infoSection.includes('nomen')
    ) {
      return VocabularyType.NOUN;
    }

    // Check URL or metadata
    const url = $('link[rel="canonical"]').attr('href') || '';
    if (url.includes('/conjugation/')) return VocabularyType.VERB;
    if (url.includes('/declension/adjectives/'))
      return VocabularyType.ADJECTIVE;
    if (url.includes('/declension/nouns/')) return VocabularyType.NOUN;

    return VocabularyType.UNSET;
  }
}
