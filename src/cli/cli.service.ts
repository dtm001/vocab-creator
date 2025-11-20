import { Injectable, Logger } from '@nestjs/common';
import { ProviderFactory } from '../providers/provider.factory';
import { IFlashcardProvider } from '../providers/interfaces/flashcard-provider.interface';
import inquirer from 'inquirer';
import * as fs from 'fs';
import * as path from 'path';
import { PackService } from '../database/services/pack.service';
import { DeckService } from '../database/services/deck.service';
import { CardService } from '../database/services/card.service';
import { FlashcardProcessingService } from '../flashcard/flashcard-processor.service';
import { ContextService } from '../context/context.service';

/**
 * CLI Service for interactive flashcard creation
 */
@Injectable()
export class CliService {
  private readonly logger = new Logger(CliService.name);
  private selectedProvider: IFlashcardProvider | null = null;
  private providerClassId: string | null = null;
  private providerDeckId: string | null = null;

  constructor(
    private readonly packService: PackService,
    private readonly deckService: DeckService,
    private readonly cardService: CardService,
    private readonly processingService: FlashcardProcessingService,
    private readonly providerFactory: ProviderFactory,
    private readonly contextService: ContextService,
  ) {}

  /**
   * Main CLI workflow
   */
  async run(): Promise<void> {
    console.log('\n🎴 German Flashcard Creator\n');

    try {
      // Step 0: Select and configure provider
      await this.selectAndConfigureProvider();

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
        pack.id,
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
   * Select and configure flashcard provider
   */
  private async selectAndConfigureProvider(): Promise<void> {
    console.log('🔌 Step 1: Select Flashcard Provider\n');

    // Prompt for provider selection
    const providerAnswer = await inquirer.prompt([
      {
        type: 'list',
        name: 'provider',
        message: 'Select your flashcard provider:',
        choices: [
          { name: 'Brainscape', value: 'brainscape' },
          { name: 'Anki (coming soon)', value: 'anki', disabled: true },
          { name: 'Quizlet (coming soon)', value: 'quizlet', disabled: true },
        ],
        default: 'brainscape',
      },
    ]);
    this.contextService.set('provider', providerAnswer.provider);

    this.selectedProvider = this.providerFactory.getProvider(
      providerAnswer.provider,
    );

    // Check if provider is already configured (env variable)
    if (this.selectedProvider.isConfigured()) {
      console.log('✅ Provider already configured via environment variables\n');
      return;
    }

    // Provider not configured - show instructions and prompt for cookies
    await this.configureProvider(providerAnswer.provider);
  }

  /**
   * Configure provider by prompting for credentials
   */
  private async configureProvider(providerName: string): Promise<void> {
    if (providerName === 'brainscape') {
      await this.configureBrainscape();
    }
    // Future: Add other provider configurations
  }

  /**
   * Configure Brainscape with detailed instructions
   */
  private async configureBrainscape(): Promise<void> {
    console.log('\n🔑 Brainscape Configuration\n');
    console.log('To use Brainscape, you need to copy your session cookies.');
    console.log('\n📝 Step-by-step instructions:\n');
    console.log('1. Open https://www.brainscape.com in your browser');
    console.log('2. Log in to your Brainscape account');
    console.log('3. Open Developer Tools:');
    console.log(
      '   - Chrome/Edge: Press F12 or Ctrl+Shift+I (Cmd+Option+I on Mac)',
    );
    console.log(
      '   - Firefox: Press F12 or Ctrl+Shift+I (Cmd+Option+I on Mac)',
    );
    console.log(
      '   - Safari: Enable Developer menu in Preferences, then Cmd+Option+I',
    );
    console.log('4. Go to the "Network" tab');
    console.log('5. Refresh the page (F5 or Cmd+R)');
    console.log('6. Click on any request in the Network tab');
    console.log(
      '7. Scroll down to find "Request Headers" section (NOT response headers)',
    );
    console.log('8. Look for TWO "set-cookie" headers (you need BOTH):');
    console.log('   - First one starts with: user_id=...');
    console.log('   - Second one starts with: _Brainscape_session_1=...');
    console.log('9. Copy the ENTIRE value of BOTH set-cookie headers');
    console.log(
      "   (Don't worry if it includes path=, domain=, etc. - we'll clean it up)",
    );
    console.log('\n📋 Example format:');
    console.log('   user_id=abc123...; path=/; samesite=lax');
    console.log(
      '   _Brainscape_session_1=xyz789...; domain=www.brainscape.com; path=/; httponly',
    );
    console.log(
      '\n💡 TIP: You can paste both lines together, or just the cookie values separated by semicolon\n',
    );

    const cookieAnswer = await inquirer.prompt([
      {
        type: 'input',
        name: 'cookies',
        message: 'Paste your Brainscape cookies here:',
        validate: (input: string) => {
          if (!input || input.trim().length === 0) {
            return 'Cookies cannot be empty';
          }
          if (
            !input.includes('user_id=') ||
            !input.includes('_Brainscape_session')
          ) {
            return 'Invalid cookies format. Make sure you copied BOTH set-cookie headers (user_id and _Brainscape_session_1).';
          }
          return true;
        },
      },
    ]);

    // Clean up the cookies (remove metadata like path=, domain=, etc.)
    const cleanedCookies = this.cleanCookieString(cookieAnswer.cookies.trim());

    console.log(
      '\n🧹 Cleaned cookies:',
      cleanedCookies.substring(0, 50) + '...\n',
    );

    // Set the cookies in the environment for this session
    this.selectedProvider.setCookies(cleanedCookies);

    // Validate the cookies work
    console.log('⏳ Validating cookies...');
    try {
      const isValid = await this.selectedProvider.validateConfig();
      if (isValid) {
        console.log('✅ Cookies validated successfully!\n');
      } else {
        console.log('❌ Cookies validation failed. Please try again.\n');
        process.exit(1);
      }
    } catch (error) {
      console.log(`❌ Error validating cookies: ${error.message}\n`);
      console.log(
        'Please make sure you copied BOTH set-cookie headers and try again.',
      );
      process.exit(1);
    }
  }

  /**
   * Clean cookie string by removing metadata (path, domain, etc.)
   */
  private cleanCookieString(cookies: string): string {
    if (!cookies) {
      throw new Error('Cookie string is empty');
    }

    const cookiesArr = cookies.split(';');

    // Find the cookie that starts with _Brainscape_session_1
    for (let cookie of cookiesArr) {
      const trimmedCookie = cookie.trim();

      if (trimmedCookie.startsWith('_Brainscape_session_1=')) {
        // Extract the value after the equals sign
        return trimmedCookie;
      }
    }

    throw new Error(
      'Could not find _Brainscape_session_1 cookie in the provided string',
    );
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

    const providerPack = await this.selectedProvider.createClass(
      answer.name.trim(),
    );
    const pack = await this.packService.create(providerPack);
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

    const providerDeck = await this.selectedProvider.createDeck(
      packId,
      answers.name.trim(),
      answers.description?.trim() || undefined,
    );
    const deck = await this.deckService.create(providerDeck);
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
