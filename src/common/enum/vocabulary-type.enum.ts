/**
 * Enum representing the types of German vocabulary entries
 */
export enum VocabularyType {
  VERB = 'verb',
  NOUN = 'noun',
  ADJECTIVE = 'adjective',
  UNSET = 'unset',
}

export function fromStringToVocabularyTypeEnum(
  typeStr: string,
): VocabularyType | null {
  switch (typeStr.toLowerCase()) {
    case 'verb':
      return VocabularyType.VERB;
    case 'noun':
      return VocabularyType.NOUN;
    case 'adjective':
      return VocabularyType.ADJECTIVE;
    case 'unset':
      return VocabularyType.UNSET;
    default:
      return null;
  }
}
