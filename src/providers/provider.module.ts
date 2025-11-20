import { Module, Global } from '@nestjs/common';
import { BrainscapeProvider } from './brainscape/brainscape.provider';
import { ProviderFactory } from './provider.factory';

/**
 * Global module for flashcard providers
 */
@Global()
@Module({
  providers: [
    BrainscapeProvider,
    // Future providers:
    // AnkiProvider,
    // QuizletProvider,
    ProviderFactory,
  ],
  exports: [ProviderFactory],
})
export class ProvidersModule {}
