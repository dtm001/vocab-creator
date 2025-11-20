import { VocabularyType } from '../enum/vocabulary-type.enum';

/**
 * Base interface for all vocabulary data returned by handlers
 */
export interface VocabularyData {
  /**
   * The German word
   */
  word: string;

  /**
   * The type of vocabulary (verb or noun)
   */
  type: VocabularyType;
}

export interface DefaultData extends VocabularyData {
  type: VocabularyType.UNSET;

  translation: string;
  example: string[];
}

/**
 * Interface for verb-specific data
 */
export interface VerbData extends VocabularyData {
  type: VocabularyType.VERB;

  /**
   * The German verb in infinitive form
   */
  word: string;

  /**
   * Present conjugations
   */
  conjugations: {
    ich: string;
    du: string;
    er: string;
    wir: string;
    ihr: string;
    sie: string;
  };

  /**
   * Simple past form (Präteritum)
   * Example: "lief" for "laufen"
   */
  simplePast: string;

  /**
   * Perfect form (past participle with auxiliary verb)
   * Example: "ist gelaufen" for "laufen"
   */
  perfekt: string;

  /**
   * English translation of the verb
   */
  translation: string;

  /**
   * Example sentence using the verb in German
   */
  example: string[];
}

/**
 * Interface for noun-specific data
 */
export interface NounData extends VocabularyData {
  type: VocabularyType.NOUN;

  /**
   * The German noun
   */
  word: string;

  /**
   * Nominative article (der/die/das)
   */
  article: string;

  /**
   * Plural form of the noun
   */
  plural: string;

  /**
   * English translation of the noun
   */
  translation: string;

  /**
   * Example sentence using the noun in German
   */
  example: string[];
}

export interface AdjectiveData extends VocabularyData {
  word: string;
  type: VocabularyType.ADJECTIVE;
  comparison: {
    positive: string;
    comparative: string;
    superlative: string;
  };
  declension: {
    strong: Record<string, string>;
    weak: Record<string, string>;
    mixed: Record<string, string>;
  };
  translation: string;
  example: string[];
}
