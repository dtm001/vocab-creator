import { Injectable, Logger } from '@nestjs/common';
import inquirer from 'inquirer';
import * as fs from 'fs';
import * as path from 'path';
import { PackService } from '../database/services/pack.service';
import { DeckService } from '../database/services/deck.service';
import { CardService } from '../database/services/card.service';
import { FlashcardProcessingService } from '../flashcard/flashcard-processor.service';

/**
 * CLI Service for interactive flashcard creation
 */
@Injectable()
export class CliService {
  private readonly logger = new Logger(CliService.name);

  constructor(
    private readonly packService: PackService,
    private readonly deckService: DeckService,
    private readonly cardService: CardService,
    private readonly processingService: FlashcardProcessingService,
  ) {}

  /**
   * Main CLI workflow
   */
  async run(): Promise<void> {
    console.log('\n🎴 German Flashcard Creator\n');

    try {
      // Step 1: Get CSV file path
      const csvPath = await this.promptForCsvPath();

      // Step 2: Select or create pack
      const pack = await this.selectOrCreatePack();

      // Step 3: Select or create deck
      const deck = await this.selectOrCreateDeck(pack.id);

      // Step 4: Confirm and process
      const confirmed = await this.confirmProcessing(
        csvPath,
        pack.name,
        deck.name,
      );

      if (!confirmed) {
        console.log('\n❌ Processing cancelled.');
        return;
      }

      // Step 5: Process the CSV file
      console.log('\n⏳ Processing flashcards...');
      const summary = await this.processingService.processFile(
        csvPath,
        deck.id,
      );

      // Step 6: Display results
      this.displayResults(summary);
    } catch (error) {
      console.error('\n❌ Error:', error.message);
      throw error;
    }
  }

  /**
   * Prompts user for CSV file path
   */
  private async promptForCsvPath(): Promise<string> {
    const answer = await inquirer.prompt([
      {
        type: 'input',
        name: 'csvPath',
        message: 'Enter the path to your CSV file:',
        validate: (input: string) => {
          if (!input) {
            return 'Path cannot be empty';
          }

          // Expand ~ to home directory
          const expandedPath = input.replace(/^~/, process.env.HOME || '');
          const absolutePath = path.resolve(expandedPath);

          if (!fs.existsSync(absolutePath)) {
            return `File not found: ${absolutePath}`;
          }

          if (!absolutePath.endsWith('.csv')) {
            return 'File must be a CSV file';
          }

          return true;
        },
      },
    ]);

    // Expand and resolve path
    const expandedPath = answer.csvPath.replace(/^~/, process.env.HOME || '');
    return path.resolve(expandedPath);
  }

  /**
   * Select existing pack or create new one
   */
  private async selectOrCreatePack() {
    const packs = await this.packService.findAll();

    const choices = [
      ...packs.map((pack) => ({
        name: pack.name,
        value: pack,
      })),
      {
        name: '➕ Create new pack',
        value: 'CREATE_NEW',
      },
    ];

    const answer = await inquirer.prompt([
      {
        type: 'list',
        name: 'pack',
        message: 'Select a pack:',
        choices,
      },
    ]);

    if (answer.pack === 'CREATE_NEW') {
      return await this.createNewPack();
    }

    return answer.pack;
  }

  /**
   * Create a new pack
   */
  private async createNewPack() {
    const answer = await inquirer.prompt([
      {
        type: 'input',
        name: 'name',
        message: 'Enter pack name:',
        validate: (input: string) => {
          if (!input || input.trim().length === 0) {
            return 'Pack name cannot be empty';
          }
          return true;
        },
      },
    ]);

    const pack = await this.packService.create(answer.name.trim());
    console.log(`✅ Created pack: ${pack.name}`);
    return pack;
  }

  /**
   * Select existing deck or create new one
   */
  private async selectOrCreateDeck(packId: string) {
    const decks = await this.deckService.findByPackId(packId);

    const choices = [
      ...decks.map((deck) => ({
        name: `${deck.name}${deck.description ? ` - ${deck.description}` : ''}`,
        value: deck,
      })),
      {
        name: '➕ Create new deck',
        value: 'CREATE_NEW',
      },
    ];

    const answer = await inquirer.prompt([
      {
        type: 'list',
        name: 'deck',
        message: 'Select a deck:',
        choices,
      },
    ]);

    if (answer.deck === 'CREATE_NEW') {
      return await this.createNewDeck(packId);
    }

    return answer.deck;
  }

  /**
   * Create a new deck
   */
  private async createNewDeck(packId: string) {
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'name',
        message: 'Enter deck name:',
        validate: (input: string) => {
          if (!input || input.trim().length === 0) {
            return 'Deck name cannot be empty';
          }
          return true;
        },
      },
      {
        type: 'input',
        name: 'description',
        message: 'Enter deck description (optional):',
      },
    ]);

    const deck = await this.deckService.create(
      answers.name.trim(),
      packId,
      answers.description?.trim() || undefined,
    );
    console.log(`✅ Created deck: ${deck.name}`);
    return deck;
  }

  /**
   * Confirm processing
   */
  private async confirmProcessing(
    csvPath: string,
    packName: string,
    deckName: string,
  ): Promise<boolean> {
    console.log('\n📋 Summary:');
    console.log(`   CSV File: ${csvPath}`);
    console.log(`   Pack: ${packName}`);
    console.log(`   Deck: ${deckName}`);

    const answer = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: 'Proceed with processing?',
        default: true,
      },
    ]);

    return answer.confirm;
  }

  /**
   * Display processing results
   */
  private displayResults(summary: any): void {
    console.log('\n✅ Processing Complete!\n');
    console.log(`📊 Results:`);
    console.log(`   Total rows: ${summary.totalRows}`);
    console.log(`   ✅ New cards created: ${summary.successCount}`);
    console.log(`   ⏭️  Skipped (duplicates): ${summary.skippedCount}`);
    console.log(`   ❌ Failed: ${summary.failureCount}`);
    console.log(
      `   ⏱️  Time: ${(summary.processingTimeMs / 1000).toFixed(2)}s`,
    );

    if (summary.failureCount > 0) {
      console.log('\n❌ Failed entries:');
      summary.results
        .filter((r: any) => !r.success)
        .forEach((r: any) => {
          console.log(`   - ${r.entry.word}: ${r.error}`);
        });
    }
  }
}
