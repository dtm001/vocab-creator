import { Injectable } from '@nestjs/common';
import { VocabularyType } from '../common/enum/vocabulary-type.enum';
import {
  AdjectiveData,
  NounData,
  VerbData,
  VocabularyData,
} from '../common/interface/vocabulary-data.interface';
import { NewCard } from '../database';

/**
 * Mapper to transform vocabulary data into flashcard format
 */
@Injectable()
export class VocabularyToCardMapper {
  /**
   * Maps vocabulary data to a card entity
   * @param vocabularyData - Verb or Noun data
   * @param deckId - Target deck ID
   * @returns NewCard object ready for insertion
   */
  mapToCard(vocabularyData: VocabularyData, deckId: string): NewCard {
    if (vocabularyData.type === VocabularyType.VERB) {
      return this.mapVerbToCard(vocabularyData as VerbData, deckId);
    } else if (vocabularyData.type === VocabularyType.NOUN) {
      return this.mapNounToCard(vocabularyData as NounData, deckId);
    } else if (vocabularyData.type === VocabularyType.ADJECTIVE) {
      return this.mapAdjectiveToCard(vocabularyData as AdjectiveData, deckId);
    }

    throw new Error(`Unsupported vocabulary type: ${vocabularyData.type}`);
  }

  /**
   * Maps verb data to card format
   * @param verbData - Verb data
   * @param deckId - Target deck ID
   * @returns NewCard object
   */
  private mapVerbToCard(verbData: VerbData, deckId: string): NewCard {
    // Question: German verb
    const question = verbData.word;

    // Answer: Translation + conjugations
    const answer = this.formatVerbAnswer(verbData);

    // Prompt: Example sentences
    const prompt = verbData.example.join('\n\n');

    // Markdown body for question: Just the verb
    const qMdBody = `**${verbData.word}**`;

    // Markdown body for answer: Detailed conjugation table
    const aMdBody = this.formatVerbMarkdown(verbData);

    return {
      deckId,
      name: verbData.word,
      question,
      answer,
      prompt,
      qMdBody,
      qMdClarifier: 'Translate and conjugate',
      qMdFootnote: null,
      qMdPrompt: null,
      aMdBody,
      aMdClarifier: `Translation: ${verbData.translation}`,
      aMdFootnote: null,
      aMdPrompt: verbData.example[0] || null,
    };
  }

  /**
   * Maps noun data to card format
   * @param nounData - Noun data
   * @param deckId - Target deck ID
   * @returns NewCard object
   */
  private mapNounToCard(nounData: NounData, deckId: string): NewCard {
    // Question: German noun with article
    const question = `${nounData.article} ${nounData.word}`;

    // Answer: Translation + plural
    const answer = this.formatNounAnswer(nounData);

    // Prompt: Example sentences
    const prompt = nounData.example.join('\n\n');

    // Markdown body for question: Noun with article
    const qMdBody = `**${nounData.article} ${nounData.word}**`;

    // Markdown body for answer: Translation and plural
    const aMdBody = this.formatNounMarkdown(nounData);

    return {
      deckId,
      name: nounData.word,
      question,
      answer,
      prompt,
      qMdBody,
      qMdClarifier: null,
      qMdFootnote: null,
      qMdPrompt: null,
      aMdBody,
      aMdClarifier: `Article: ${nounData.article}`,
      aMdFootnote: `Plural: ${nounData.plural}`,
      aMdPrompt: nounData.example[0] || null,
    };
  }

  private mapAdjectiveToCard(
    adjectiveData: AdjectiveData,
    deckId: string,
  ): NewCard {
    const question = adjectiveData.word;
    const answer = this.formatAdjectiveAnswer(adjectiveData);
    const prompt = adjectiveData.example.join('\n\n');
    const qMdBody = `**${adjectiveData.word}**`;
    const aMdBody = this.formatAdjectiveMarkdown(adjectiveData);

    return {
      deckId,
      name: adjectiveData.word,
      question,
      answer,
      prompt,
      qMdBody,
      qMdClarifier: 'Translate and decline',
      qMdFootnote: null,
      qMdPrompt: null,
      aMdBody,
      aMdClarifier: `Translation: ${adjectiveData.translation}`,
      aMdFootnote: null,
      aMdPrompt: adjectiveData.example[0] || null,
    };
  }

  // Formatting helpers:
  private formatAdjectiveAnswer(adjectiveData: AdjectiveData): string {
    const parts = [
      `Translation: ${adjectiveData.translation}`,
      '',
      `Comparison:`,
      `  Positive: ${adjectiveData.comparison.positive}`,
      `  Comparative: ${adjectiveData.comparison.comparative}`,
      `  Superlative: ${adjectiveData.comparison.superlative}`,
      '',
      `Declension: \n ${this.allDeclensionTables(adjectiveData.declension)}`,
    ];
    return parts.join('\n');
  }

  private allDeclensionTables(obj) {
    return [
      this.declensionCompact('Strong', obj.strong),
      this.declensionCompact('Weak', obj.weak),
      this.declensionCompact('Mixed', obj.mixed),
    ].join('\n\n');
  }

  private declensionCompact(title, forms) {
    const genders = [
      ['masculine', 'Masc'],
      ['feminine', 'Fem'],
      ['neutral', 'Neut'],
      ['plural', 'Pl'],
    ];
    const cases = ['nominative', 'accusative', 'dative', 'genitive'];
    const caseLabels = {
      nominative: 'Nom',
      accusative: 'Acc',
      dative: 'Dat',
      genitive: 'Gen',
    };

    let md = `### ${title}\n\n`;

    for (const [gender, short] of genders) {
      md += `**${short}:** \n`;
      md += cases.map((c) => `${forms[`${gender}_${c}`]}`).join('•');
      md += '  \n';
    }
    return md;
  }

  private declensionTableMarkdown(title, forms) {
    const genders = ['masculine', 'feminine', 'neutral', 'plural'];
    const cases = ['nominative', 'genitive', 'dative', 'accusative'];

    let md = `### ${title}\n`;
    md += `| Gender | ${cases.map((c) => this.capitalize(c)).join(' | ')} |\n`;
    md += `|--------|${cases.map(() => '------------').join('|')}|\n`;

    for (const gender of genders) {
      const row = [
        this.capitalize(gender),
        ...cases.map((c) => forms[`${gender}_${c}`] || ''),
      ];
      md += `| ${row.join(' | ')} |\n`;
    }

    return md;
  }

  private capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  private formatAdjectiveMarkdown(adjectiveData: AdjectiveData): string {
    return `
### ${adjectiveData.word}

**Translation:** ${adjectiveData.translation}

#### Comparison
- **Positive:** ${adjectiveData.comparison.positive}
- **Comparative:** ${adjectiveData.comparison.comparative}
- **Superlative:** ${adjectiveData.comparison.superlative}

#### Declension Tables
(nominative, accusative, dative, genitive)
${this.allDeclensionTables(adjectiveData.declension)}
  `.trim();
  }

  /**
   * Formats verb answer as plain text
   */
  private formatVerbAnswer(verbData: VerbData): string {
    const parts = [
      `Translation: ${verbData.translation}`,
      '',
      'Present:',
      `  ich ${verbData.conjugations.ich}`,
      `  du ${verbData.conjugations.du}`,
      `  er/sie/es ${verbData.conjugations.er}`,
      `  wir ${verbData.conjugations.wir}`,
      `  ihr ${verbData.conjugations.ihr}`,
      `  sie ${verbData.conjugations.sie}`,
      '',
      `Simple Past: ${verbData.simplePast}`,
      `Perfect: ${verbData.perfekt}`,
    ];

    return parts.join('\n');
  }

  /**
   * Formats verb data as markdown
   */
  private formatVerbMarkdown(verbData: VerbData): string {
    return `
### ${verbData.word}

**Translation:** ${verbData.translation}

#### Present Tense
| Person | Conjugation |
|--------|-------------|
| ich | ${verbData.conjugations.ich} |
| du | ${verbData.conjugations.du} |
| er/sie/es | ${verbData.conjugations.er} |
| wir | ${verbData.conjugations.wir} |
| ihr | ${verbData.conjugations.ihr} |
| sie | ${verbData.conjugations.sie} |

**Simple Past (Präteritum):** ${verbData.simplePast}

**Perfect:** ${verbData.perfekt}
    `.trim();
  }

  /**
   * Formats noun answer as plain text
   */
  private formatNounAnswer(nounData: NounData): string {
    const parts = [
      `Translation: ${nounData.translation}`,
      `Article: ${nounData.article}`,
      `Plural: ${nounData.plural}`,
    ];

    return parts.join('\n');
  }

  /**
   * Formats noun data as markdown
   */
  private formatNounMarkdown(nounData: NounData): string {
    return `
### ${nounData.article} ${nounData.word}

**Translation:** ${nounData.translation}

**Article:** ${nounData.article}

**Plural:** ${nounData.plural}
    `.trim();
  }

  /**
   * Maps multiple vocabulary items to cards
   * @param vocabularyItems - Array of vocabulary data
   * @param deckId - Target deck ID
   * @returns Array of NewCard objects
   */
  mapManyToCards(vocabularyItems: VocabularyData[], deckId: string): NewCard[] {
    return vocabularyItems.map((item) => this.mapToCard(item, deckId));
  }
}
