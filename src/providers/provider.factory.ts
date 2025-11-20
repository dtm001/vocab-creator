import { Injectable, Logger } from '@nestjs/common';
import { IFlashcardProvider } from './interfaces/flashcard-provider.interface';
import { BrainscapeProvider } from './brainscape/brainscape.provider';

/**
 * Factory for selecting and managing flashcard providers
 */
@Injectable()
export class ProviderFactory {
  private readonly logger = new Logger(ProviderFactory.name);
  private readonly providers: Map<string, IFlashcardProvider>;

  constructor(private readonly brainscapeProvider: BrainscapeProvider) {
    // Register all available providers
    this.providers = new Map([
      ['brainscape', this.brainscapeProvider],
      // Future providers:
      // ['anki', this.ankiProvider],
      // ['quizlet', this.quizletProvider],
    ]);
  }

  /**
   * Get a provider by name
   * @param providerName - Name of the provider
   * @returns Provider instance
   * @throws Error if provider not found
   */
  getProvider(providerName: string): IFlashcardProvider {
    const provider = this.providers.get(providerName.toLowerCase());

    if (!provider) {
      const available = this.getAvailableProviders().join(', ');
      throw new Error(
        `Unknown provider: ${providerName}. Available providers: ${available}`,
      );
    }

    return provider;
  }

  /**
   * Get the default provider (from env or fallback)
   * @returns Default provider instance
   */
  getDefaultProvider(): IFlashcardProvider {
    const defaultName = process.env.FLASHCARD_PROVIDER || 'brainscape';
    return this.getProvider(defaultName);
  }

  /**
   * Get list of all available provider names
   * @returns Array of provider names
   */
  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Get list of configured providers (with valid config)
   * @returns Array of configured provider names
   */
  async getConfiguredProviders(): Promise<string[]> {
    const configured: string[] = [];

    for (const [name, provider] of this.providers) {
      if (provider.isConfigured()) {
        configured.push(name);
      }
    }

    return configured;
  }

  /**
   * Validate all provider configurations
   * @returns Map of provider names to validation results
   */
  async validateAllProviders(): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();

    for (const [name, provider] of this.providers) {
      try {
        const isValid = await provider.validateConfig();
        results.set(name, isValid);
      } catch (error) {
        this.logger.error(`Error validating ${name}: ${error.message}`);
        results.set(name, false);
      }
    }

    return results;
  }
}
