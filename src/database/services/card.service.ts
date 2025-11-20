import { Injectable, Logger } from '@nestjs/common';
import { eq, and, sql } from 'drizzle-orm';
import { DatabaseService } from '../database.service';
import { cards, NewCard, Card } from '../schema';

/**
 * Service for managing Card entities
 */
@Injectable()
export class CardService {
  private readonly logger = new Logger(CardService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Creates a new card
   * @param cardData - Card data
   * @returns Created card
   */
  async create(cardData: NewCard): Promise<Card> {
    const result = await this.databaseService.db
      .insert(cards)
      .values(cardData)
      .returning();

    return result[0];
  }

  /**
   * Creates multiple cards in a batch
   * @param cardsData - Array of card data
   * @returns Array of created cards
   */
  async createMany(cardsData: NewCard[]): Promise<Card[]> {
    if (cardsData.length === 0) return [];

    const result = await this.databaseService.db
      .insert(cards)
      .values(cardsData)
      .returning();

    this.logger.log(`Created ${result.length} cards`);
    return result;
  }

  /**
   * Finds a card by ID
   * @param id - Card ID
   * @returns Card or undefined
   */
  async findById(id: string): Promise<Card | undefined> {
    const result = await this.databaseService.db
      .select()
      .from(cards)
      .where(eq(cards.id, id))
      .limit(1);

    return result[0];
  }

  /**
   * Checks if a card with the same name exists in a deck
   * @param name - Card name (German word)
   * @param deckId - Deck ID
   * @returns True if card exists
   */
  async existsByNameInDeck(name: string, deckId: string): Promise<boolean> {
    const result = await this.databaseService.db
      .select({ id: cards.id })
      .from(cards)
      .where(and(eq(cards.name, name), eq(cards.deckId, deckId)))
      .limit(1);

    return result.length > 0;
  }

  /**
   * Finds a card by name in a specific deck
   * @param name - Card name
   * @param deckId - Deck ID
   * @returns Card or undefined
   */
  async findByNameInDeck(
    name: string,
    deckId: string,
  ): Promise<Card | undefined> {
    const result = await this.databaseService.db
      .select()
      .from(cards)
      .where(and(eq(cards.name, name), eq(cards.deckId, deckId)))
      .limit(1);

    return result[0];
  }

  /**
   * Gets all cards for a specific deck
   * @param deckId - Deck ID
   * @returns Array of cards
   */
  async findByDeckId(deckId: string): Promise<Card[]> {
    return await this.databaseService.db
      .select()
      .from(cards)
      .where(eq(cards.deckId, deckId));
  }

  /**
   * Gets all cards
   * @returns Array of all cards
   */
  async findAll(): Promise<Card[]> {
    return await this.databaseService.db.select().from(cards);
  }

  /**
   * Updates a card
   * @param id - Card ID
   * @param cardData - Partial card data to update
   * @returns Updated card
   */
  async update(id: string, cardData: Partial<NewCard>): Promise<Card> {
    const result = await this.databaseService.db
      .update(cards)
      .set(cardData)
      .where(eq(cards.id, id))
      .returning();

    return result[0];
  }

  /**
   * Deletes a card
   * @param id - Card ID
   */
  async delete(id: string): Promise<void> {
    await this.databaseService.db.delete(cards).where(eq(cards.id, id));
  }

  /**
   * Deletes all cards in a deck
   * @param deckId - Deck ID
   */
  async deleteByDeckId(deckId: string): Promise<void> {
    await this.databaseService.db.delete(cards).where(eq(cards.deckId, deckId));
  }

  /**
   * Counts cards in a deck
   * @param deckId - Deck ID
   * @returns Number of cards
   */
  async countByDeckId(deckId: string): Promise<number> {
    const result = await this.databaseService.db
      .select({ count: sql<number>`count(*)` })
      .from(cards)
      .where(eq(cards.deckId, deckId));

    return result[0]?.count || 0;
  }

  /**
   * Gets existing card names in a deck (for duplicate checking)
   * @param deckId - Deck ID
   * @returns Set of card names
   */
  async getExistingNamesInDeck(deckId: string): Promise<Set<string>> {
    const result = await this.databaseService.db
      .select({ name: cards.name })
      .from(cards)
      .where(eq(cards.deckId, deckId));

    return new Set(result.map((card) => this.cleanGermanText(card.name)));
  }

  cleanGermanText(text) {
    /**
     * Removes non-German characters from a string
     * Keeps: a-z, A-Z, German umlauts (ä, ö, ü, Ä, Ö, Ü), ß, spaces, and hyphens
     * @param {string} text - The text to clean
     * @returns {string} - The cleaned text
     */

    if (!text) {
      return '';
    }

    // Regular expression that matches valid German characters
    // Includes: a-z, A-Z, umlauts (äöüÄÖÜ), ß, spaces, and hyphens
    const germanCharPattern = /[a-zA-ZäöüÄÖÜß\s-]/g;

    // Extract only the valid characters
    const matches = text.match(germanCharPattern);

    return matches ? matches.join('') : '';
  }

  /**
   * Filters out words that already exist as cards in a deck
   * @param words - Array of words to check
   * @param deckId - Deck ID
   * @returns Array of words that don't exist yet
   */
  async filterNewWords(words: string[], deckId: string): Promise<string[]> {
    const existingNames = await this.getExistingNamesInDeck(deckId);
    const newWords = words.filter((word) => !existingNames.has(word));

    this.logger.log(
      `Filtered ${words.length - newWords.length} duplicate words. ${
        newWords.length
      } new words to process.`,
    );

    return newWords;
  }
}
