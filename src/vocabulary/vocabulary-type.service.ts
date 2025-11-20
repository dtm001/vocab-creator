import { Injectable } from '@nestjs/common';
import * as cheerio from 'cheerio';
import { VocabularyType } from '../common/enum/vocabulary-type.enum';

@Injectable()
export class VocabularyTypeService {
  /**
   * Determines the word type (NOUN, VERB, or ADJECTIVE) from HTML content
   * @param html - HTML content as string
   * @returns 'NOUN' | 'VERB' | 'ADJECTIVE' | null
   */
  determineWordTypeWeightedFallback(html: string): VocabularyType {
    // Quick checks for performance - check first 3000 characters
    const htmlStart = html.substring(0, 3000);

    // Score each type
    let nounScore = 0;
    let verbScore = 0;
    let adjectiveScore = 0;

    // Check title (highest weight)
    if (/Declension.*adjective/i.test(htmlStart)) {
      adjectiveScore += 10;
    }
    if (/Declension.*noun/i.test(htmlStart)) {
      nounScore += 10;
    }
    if (/Conjugation.*verb/i.test(htmlStart)) {
      verbScore += 10;
    }

    // Check URL patterns in links
    if (/\/declension\/adjectives\//i.test(htmlStart)) {
      adjectiveScore += 8;
    }
    if (/\/declension\/nouns\//i.test(htmlStart)) {
      nounScore += 8;
    }
    if (/\/conjugation\//i.test(htmlStart)) {
      verbScore += 8;
    }

    // Check for specific content patterns
    if (/adjective.*·.*irregular.*·.*comparable/i.test(htmlStart)) {
      adjectiveScore += 6;
    }
    if (/noun.*·.*neutral.*·.*irregular/i.test(htmlStart)) {
      nounScore += 6;
    }
    if (/verb.*·.*irregular.*·.*(sein|haben)/i.test(htmlStart)) {
      verbScore += 6;
    }

    // Check for grammar-specific terms in first 5000 chars
    const htmlMid = html.substring(0, 5000);

    // Verb-specific: conjugation terms
    if (/imperative|infinitive|participle/i.test(htmlMid)) {
      verbScore += 3;
    }

    // Adjective-specific: comparison forms
    if (/comparative.*superlative|positive.*comparative/i.test(htmlMid)) {
      adjectiveScore += 4;
    }

    // Noun-specific: article and plural
    if (/(der|die|das).*plural.*singular/i.test(htmlMid)) {
      nounScore += 3;
    }

    // Declension terms (both noun and adjective)
    if (/nominative.*genitive.*dative.*accusative/i.test(htmlMid)) {
      // Check if it's more likely adjective or noun
      if (/weak.*strong.*mixed.*declension/i.test(htmlMid)) {
        adjectiveScore += 2;
      } else {
        nounScore += 2;
      }
    }

    // Determine winner
    const maxScore = Math.max(nounScore, verbScore, adjectiveScore);

    if (maxScore === 0) {
      return VocabularyType.UNSET; // Unable to determine
    }

    if (verbScore === maxScore) {
      return VocabularyType.VERB;
    }
    if (nounScore === maxScore) {
      return VocabularyType.NOUN;
    }
    if (adjectiveScore === maxScore) {
      return VocabularyType.ADJECTIVE;
    }

    return VocabularyType.UNSET;
  }

  /**
   * Determines the word type (NOUN, VERB, or ADJECTIVE) from HTML content
   * Uses guaranteed identifiers with fallback strategy
   * @param html - HTML content as string
   * @returns 'NOUN' | 'VERB' | 'ADJECTIVE' | null
   */
  determineWordType(html: string): VocabularyType {
    const $ = cheerio.load(html);

    // METHOD 1: Check breadcrumb navigation (MOST RELIABLE)
    const breadcrumb = $('nav.rKrml').text();
    if (breadcrumb) {
      if (breadcrumb.includes('Adjectives')) {
        return VocabularyType.ADJECTIVE;
      }
      if (breadcrumb.includes('Nouns')) {
        return VocabularyType.NOUN;
      }
      if (breadcrumb.includes('Conjugation')) {
        return VocabularyType.VERB;
      }
    }

    // METHOD 2: Check title tag (100% RELIABLE)
    const title = $('title').text().toLowerCase();
    if (title) {
      // Check for specific patterns to avoid false positives
      if (title.includes('declension') && title.includes('adjective')) {
        return VocabularyType.ADJECTIVE;
      }
      if (title.includes('declension') && title.includes('noun')) {
        return VocabularyType.NOUN;
      }
      if (title.includes('conjugation') && title.includes('verb')) {
        return VocabularyType.VERB;
      }
    }

    // METHOD 3: Check H1 heading (100% RELIABLE)
    const h1 = $('h1').first().text().toLowerCase();
    if (h1) {
      if (h1.includes('adjective')) {
        return VocabularyType.ADJECTIVE;
      }
      if (h1.includes('noun')) {
        return VocabularyType.NOUN;
      }
      if (h1.includes('verb')) {
        return VocabularyType.VERB;
      }
    }

    // METHOD 4: Check word type declaration pattern (FALLBACK)
    const bodyText = $('body').text();
    const declarationMatch = bodyText.match(
      /A1\s*·\s*(adjective|verb|noun)\s*·/i,
    );
    if (declarationMatch) {
      const wordType = declarationMatch[1].toUpperCase();
      if (wordType === 'ADJECTIVE') return VocabularyType.ADJECTIVE;
      if (wordType === 'VERB') return VocabularyType.VERB;
      if (wordType === 'NOUN') return VocabularyType.NOUN;
    }

    // If all methods fail, return null
    return this.determineWordTypeWeightedFallback(html);
  }
}
