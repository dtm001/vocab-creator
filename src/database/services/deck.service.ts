import { Injectable } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { DatabaseService } from '../database.service';
import { decks, NewDeck, Deck } from '../schema';

/**
 * Service for managing Deck entities
 */
@Injectable()
export class DeckService {
  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Creates a new deck
   * @param name - Name of the deck
   * @param packId - ID of the parent pack
   * @param description - Optional description
   * @returns Created deck
   */
  async create(
    name: string,
    packId: string,
    description?: string,
  ): Promise<Deck> {
    const newDeck: NewDeck = {
      name,
      packId,
      description: description || null,
    };

    const result = await this.databaseService.db
      .insert(decks)
      .values(newDeck)
      .returning();

    return result[0];
  }

  /**
   * Finds a deck by ID
   * @param id - Deck ID
   * @returns Deck or undefined
   */
  async findById(id: string): Promise<Deck | undefined> {
    const result = await this.databaseService.db
      .select()
      .from(decks)
      .where(eq(decks.id, id))
      .limit(1);

    return result[0];
  }

  /**
   * Finds a deck by name within a specific pack
   * @param name - Deck name
   * @param packId - Pack ID
   * @returns Deck or undefined
   */
  async findByNameInPack(
    name: string,
    packId: string,
  ): Promise<Deck | undefined> {
    const result = await this.databaseService.db
      .select()
      .from(decks)
      .where(and(eq(decks.name, name), eq(decks.packId, packId)))
      .limit(1);

    return result[0];
  }

  /**
   * Gets all decks for a specific pack
   * @param packId - Pack ID
   * @returns Array of decks
   */
  async findByPackId(packId: string): Promise<Deck[]> {
    return await this.databaseService.db
      .select()
      .from(decks)
      .where(eq(decks.packId, packId));
  }

  /**
   * Gets all decks
   * @returns Array of all decks
   */
  async findAll(): Promise<Deck[]> {
    return await this.databaseService.db.select().from(decks);
  }

  /**
   * Updates a deck
   * @param id - Deck ID
   * @param name - New name
   * @param description - New description
   * @returns Updated deck
   */
  async update(id: string, name?: string, description?: string): Promise<Deck> {
    const updateData: Partial<Deck> = {
      updatedAt: new Date(),
    };

    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;

    const result = await this.databaseService.db
      .update(decks)
      .set(updateData)
      .where(eq(decks.id, id))
      .returning();

    return result[0];
  }

  /**
   * Deletes a deck (cascades to cards)
   * @param id - Deck ID
   */
  async delete(id: string): Promise<void> {
    await this.databaseService.db.delete(decks).where(eq(decks.id, id));
  }

  /**
   * Gets deck with all its cards
   * @param id - Deck ID
   * @returns Deck with cards relation
   */
  async findByIdWithCards(id: string) {
    return await this.databaseService.db.query.decks.findFirst({
      where: eq(decks.id, id),
      with: {
        cards: true,
      },
    });
  }

  /**
   * Counts cards in a deck
   * @param deckId - Deck ID
   * @returns Number of cards
   */
  async getCardCount(deckId: string): Promise<number> {
    const deck = await this.findByIdWithCards(deckId);
    return deck?.cards?.length || 0;
  }
}
