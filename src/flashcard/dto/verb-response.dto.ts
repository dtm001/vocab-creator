/**
 * Response DTO for verb data
 */
export class VerbResponseDto {
  /**
   * The German verb (infinitive)
   */
  word: string;

  /**
   * Type identifier
   */
  type: 'verb';

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
   */
  simplePast: string;

  /**
   * Perfect form (past participle with auxiliary)
   */
  perfekt: string;

  /**
   * English translation
   */
  translation: string;

  /**
   * Example sentence in German
   */
  example: string[];
}
