/**
 * Response DTO for noun data
 */
export class NounResponseDto {
  /**
   * The German noun
   */
  word: string;

  /**
   * Type identifier
   */
  type: 'noun';

  /**
   * Nominative article (der/die/das)
   */
  article: string;

  /**
   * Plural form of the noun
   */
  plural: string;

  /**
   * English translation
   */
  translation: string;

  /**
   * Example sentence in German
   */
  example: string[];
}
