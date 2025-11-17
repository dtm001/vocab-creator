import { Injectable } from '@nestjs/common';
import { VocabularyType } from '../common/enum/vocabulary-type.enum';
import {
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
    const qMdBody = `**${verbData.word}** (verb)`;

    // Markdown body for answer: Detailed conjugation table
    const aMdBody = this.formatVerbMarkdown(verbData);

    return {
      deckId,
      name: verbData.word,
      question,
      answer,
      prompt,
      qMdBody,
      qMdClarifier: 'Translate and conjugate this German verb',
      qMdFootnote: null,
      qMdPrompt: 'What is the English translation and conjugation?',
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
    const qMdBody = `**${nounData.article} ${nounData.word}** (noun)`;

    // Markdown body for answer: Translation and plural
    const aMdBody = this.formatNounMarkdown(nounData);

    return {
      deckId,
      name: nounData.word,
      question,
      answer,
      prompt,
      qMdBody,
      qMdClarifier: 'Translate this German noun',
      qMdFootnote: null,
      qMdPrompt: 'What is the English translation?',
      aMdBody,
      aMdClarifier: `Article: ${nounData.article}`,
      aMdFootnote: `Plural: ${nounData.plural}`,
      aMdPrompt: nounData.example[0] || null,
    };
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
