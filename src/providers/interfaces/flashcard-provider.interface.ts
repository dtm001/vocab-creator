import { Card, NewCard } from '../../database/schema';

/**
 * Provider-agnostic class/pack representation
 */
export interface ProviderClass {
  id: string;
  name: string;
  provider: string;
}

/**
 * Provider-agnostic deck representation
 */
export interface ProviderDeck {
  id: string;
  name: string;
  description?: string;
  classId: string;
  provider: string;
}

/**
 * Provider-agnostic card representation
 */
export interface ProviderCard {
  id: string;
  name: string;
  provider: string;
}

/**
 * Result of syncing multiple cards
 */
export interface SyncResult {
  success: number;
  failed: number;
  errors: string[];
}

/**
 * Base interface that all flashcard providers must implement
 */
export interface IFlashcardProvider {
  /**
   * Get the provider name
   */
  getName(): string;

  /**
   * Set authentication cookies or tokens
   * @param cookies - Authentication cookies or tokens
   */
  setCookies(cookies: string): void;

  /**
   * Check if provider is properly configured
   */
  isConfigured(): boolean;

  /**
   * Validate provider configuration
   */
  validateConfig(): Promise<boolean>;

  /**
   * Create a new class/pack
   * @param name - Class name
   */
  createClass(name: string): Promise<ProviderClass>;

  /**
   * Get all classes/packs
   */
  getClasses(): Promise<ProviderClass[]>;

  /**
   * Create a new deck
   * @param classId - Parent class ID
   * @param name - Deck name
   * @param description - Optional description
   */
  createDeck(
    classId: string,
    name: string,
    description?: string,
  ): Promise<ProviderDeck>;

  /**
   * Get all decks in a class
   * @param classId - Class ID
   */
  getDecks(classId: string): Promise<ProviderDeck[]>;

  /**
   * Create a single card
   * @param classId - Class ID
   * @param deckId - Deck ID
   * @param card - Card data
   */
  createCard(
    classId: string,
    deckId: string,
    card: NewCard,
  ): Promise<ProviderCard>;

  /**
   * Create multiple cards (batch operation)
   * @param classId - Class ID
   * @param deckId - Deck ID
   * @param cards - Array of cards
   */
  createCards(
    classId: string,
    deckId: string,
    cards: Card[],
  ): Promise<SyncResult>;
}
