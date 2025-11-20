import { Injectable, Logger } from '@nestjs/common';
import {
  IFlashcardProvider,
  ProviderClass,
  ProviderDeck,
  ProviderCard,
  SyncResult,
} from '../interfaces/flashcard-provider.interface';
import { Card, NewCard } from '../../database/schema';

/**
 * Brainscape flashcard provider implementation
 */
@Injectable()
export class BrainscapeProvider implements IFlashcardProvider {
  private readonly logger = new Logger(BrainscapeProvider.name);
  private readonly baseUrl = 'https://www.brainscape.com/api/v2';
  private cookies: string;

  constructor() {
    this.cookies = process.env.BRAINSCAPE_COOKIES || '';
  }

  setCookies(cookies: string) {
    this.logger.log('Setting Brainscape cookies');
    this.cookies = cookies;
  }

  getName(): string {
    return 'brainscape';
  }

  isConfigured(): boolean {
    return !!this.cookies;
  }

  async validateConfig(): Promise<boolean> {
    this.logger.log('Validating Brainscape configuration');
    if (!this.isConfigured()) {
      this.logger.warn('Brainscape cookies not configured');
      return false;
    }

    try {
      // Try to fetch classes to validate credentials
      const res = await this.getUserData();
      return res !== null && res !== undefined;
    } catch (error) {
      this.logger.error('Brainscape configuration invalid:', error.message);
      return false;
    }
  }

  async createClass(name: string): Promise<ProviderClass> {
    this.logger.log(`Creating Brainscape class: ${name}`);

    const response = await fetch(`${this.baseUrl}/packs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: this.cookies,
      },
      body: JSON.stringify({
        pack: { name },
        is_web: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create class: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      id: data.packId.toString(),
      name: data.name,
      provider: 'brainscape',
    };
  }

  async getClasses(): Promise<ProviderClass[]> {
    // Note: Brainscape API endpoint for listing packs may vary
    // This is a placeholder - adjust based on actual API
    throw new Error('Not implemented: getClasses');
    this.logger.log('Fetching Brainscape classes');

    const response = await fetch(`${this.baseUrl}/packs`, {
      method: 'GET',
      headers: {
        Cookie: this.cookies,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch classes: ${response.statusText}`);
    }

    const data = await response.json();
    return data.map((pack: any) => ({
      id: pack.id.toString(),
      name: pack.name,
      provider: 'brainscape',
    }));
  }

  async getUserData(): Promise<any> {
    this.logger.log('Fetching Brainscape user data');
    this.logger.log('using cookies:', this.cookies);
    const response = await fetch(`${this.baseUrl}/me/profile?is_web=true`, {
      method: 'GET',
      headers: {
        Cookie: this.cookies,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch user data: ${response.statusText}`);
    }

    return await response.json();
  }

  async createDeck(
    classId: string,
    name: string,
    description?: string,
  ): Promise<ProviderDeck> {
    this.logger.log(`Creating Brainscape deck: ${name} in class ${classId}`);

    const response = await fetch(`${this.baseUrl}/packs/${classId}/decks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: this.cookies,
      },
      body: JSON.stringify({
        name,
        desc: description || '',
        is_web: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create deck: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      id: data.deck.deckId.toString(),
      name: data.deck.name,
      description: data.deck.desc,
      classId,
      provider: 'brainscape',
    };
  }

  async getDecks(classId: string): Promise<ProviderDeck[]> {
    this.logger.log(`Fetching Brainscape decks for class ${classId}`);

    const response = await fetch(`${this.baseUrl}/packs/${classId}/decks`, {
      method: 'GET',
      headers: {
        Cookie: this.cookies,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch decks: ${response.statusText}`);
    }

    const data = await response.json();
    return data.map((deck: any) => ({
      id: deck.id.toString(),
      name: deck.name,
      description: deck.desc,
      classId,
      provider: 'brainscape',
    }));
  }

  async createCard(
    classId: string,
    deckId: string,
    card: NewCard,
  ): Promise<ProviderCard> {
    this.logger.log(`Creating Brainscape card: ${card.name}`);

    const response = await fetch(
      `${this.baseUrl}/packs/${classId}/decks/${deckId}/cards`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: this.cookies,
        },
        body: JSON.stringify({
          answer: card.answer,
          name: card.name,
          prompt: card.prompt,
          question: card.question,
          aMdBody: card.aMdBody,
          aMdClarifier: card.aMdPrompt,
          aMdFootnote: card.aMdFootnote,
          aMdPrompt: null,
          qMdBody: card.qMdBody,
          qMdClarifier: card.qMdClarifier,
          qMdFootnote: card.qMdFootnote,
          qMdPrompt: card.qMdPrompt,
          is_web: true,
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to create card: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      id: data.card.cardId.toString(),
      name: card.name,
      provider: 'brainscape',
    };
  }

  async createCards(
    classId: string,
    deckId: string,
    cards: Card[],
  ): Promise<SyncResult> {
    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const card of cards) {
      try {
        await this.createCard(classId, deckId, card);
        success++;
      } catch (error) {
        failed++;
        const errorMsg = `Failed to sync card ${card.name}: ${error.message}`;
        this.logger.error(errorMsg);
        errors.push(errorMsg);
      }
    }

    this.logger.log(`Sync complete: ${success} succeeded, ${failed} failed`);
    return { success, failed, errors };
  }
}
