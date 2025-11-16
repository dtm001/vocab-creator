import {
  VocabularyData,
  VerbData,
  NounData,
} from '../interface/vocabulary-data.interface';
import { VocabularyType } from '../enum/vocabulary-type.enum';

/**
 * Type guard to check if vocabulary data is VerbData
 * @param data - Vocabulary data to check
 * @returns true if data is VerbData
 */
export function isVerbData(data: VocabularyData): data is VerbData {
  return data.type === VocabularyType.VERB;
}

/**
 * Type guard to check if vocabulary data is NounData
 * @param data - Vocabulary data to check
 * @returns true if data is NounData
 */
export function isNounData(data: VocabularyData): data is NounData {
  return data.type === VocabularyType.NOUN;
}
