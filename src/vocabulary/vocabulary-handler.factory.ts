import { Injectable, Logger } from '@nestjs/common';
import { VocabularyType } from '../common/enum/vocabulary-type.enum';
import { IVocabularyHandler } from './interface/vocabulary-handler.interface';
import { VerbHandler } from './verb.handler';
import { NounHandler } from './noun.handler';
import { AdjectiveHandler } from './adjective.handler';
import { DefaultHandler } from './default.handler';

/**
 * Factory for selecting the appropriate vocabulary handler based on type
 */
@Injectable()
export class VocabularyHandlerFactory {
  private readonly logger = new Logger(VocabularyHandlerFactory.name);
  private readonly handlers: IVocabularyHandler[];

  constructor(
    private readonly verbHandler: VerbHandler,
    private readonly nounHandler: NounHandler,
    private readonly adjectiveHandler: AdjectiveHandler,
    private readonly defaultHandler: DefaultHandler,
  ) {
    // Register all available handlers
    this.handlers = [
      this.verbHandler,
      this.nounHandler,
      this.adjectiveHandler,
      this.defaultHandler,
    ];
  }

  /**
   * Gets the appropriate handler for the given vocabulary type
   * @param type - The vocabulary type
   * @returns The handler that can process this type
   * @throws Error if no handler is found for the type
   */
  getHandler(type: VocabularyType): IVocabularyHandler {
    this.logger.debug(`Getting handler for type: ${type}`);

    const handler = this.handlers.find((h) => h.canHandle(type));

    if (!handler) {
      const error = `No handler found for vocabulary type: ${type}`;
      this.logger.error(error);
      throw new Error(error);
    }

    this.logger.debug(`Selected handler: ${handler.constructor.name}`);
    return handler;
  }

  /**
   * Gets all registered handlers
   * @returns Array of all vocabulary handlers
   */
  getAllHandlers(): IVocabularyHandler[] {
    return this.handlers;
  }
}
