import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DatabaseService } from '../database.service';
import { packs, NewPack, Pack } from '../schema';
import { ProviderClass } from 'src/providers/interfaces/flashcard-provider.interface';

/**
 * Service for managing Pack entities
 */
@Injectable()
export class PackService {
  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Creates a new pack
   * @param name - Name of the pack
   * @returns Created pack
   */
  async create(packDetails: ProviderClass): Promise<Pack> {
    const newPack: NewPack = {
      name: packDetails.name,
      id: packDetails.id,
    };

    const result = await this.databaseService.db
      .insert(packs)
      .values(newPack)
      .returning();

    return result[0];
  }

  /**
   * Finds a pack by ID
   * @param id - Pack ID
   * @returns Pack or undefined
   */
  async findById(id: string): Promise<Pack | undefined> {
    const result = await this.databaseService.db
      .select()
      .from(packs)
      .where(eq(packs.id, id))
      .limit(1);

    return result[0];
  }

  /**
   * Finds a pack by name
   * @param name - Pack name
   * @returns Pack or undefined
   */
  async findByName(name: string): Promise<Pack | undefined> {
    const result = await this.databaseService.db
      .select()
      .from(packs)
      .where(eq(packs.name, name))
      .limit(1);

    return result[0];
  }

  /**
   * Gets all packs
   * @returns Array of all packs
   */
  async findAll(): Promise<Pack[]> {
    return await this.databaseService.db.select().from(packs);
  }

  /**
   * Updates a pack's name
   * @param id - Pack ID
   * @param name - New name
   * @returns Updated pack
   */
  async update(id: string, name: string): Promise<Pack> {
    const result = await this.databaseService.db
      .update(packs)
      .set({ name, updatedAt: new Date() })
      .where(eq(packs.id, id))
      .returning();

    return result[0];
  }

  /**
   * Deletes a pack (cascades to decks and cards)
   * @param id - Pack ID
   */
  async delete(id: string): Promise<void> {
    await this.databaseService.db.delete(packs).where(eq(packs.id, id));
  }

  /**
   * Gets pack with all its decks
   * @param id - Pack ID
   * @returns Pack with decks relation
   */
  async findByIdWithDecks(id: string) {
    return await this.databaseService.db.query.packs.findFirst({
      where: eq(packs.id, id),
      with: {
        decks: true,
      },
    });
  }
}
