import { Module } from '@nestjs/common';
import { HttpClientService } from './http-client.service';
import { VerbHandler } from './verb.handler';
import { NounHandler } from './noun.handler';
import { VocabularyHandlerFactory } from './vocabulary-handler.factory';

/**
 * Module for vocabulary processing functionality
 */
@Module({
  providers: [
    HttpClientService,
    VerbHandler,
    NounHandler,
    VocabularyHandlerFactory,
  ],
  exports: [VocabularyHandlerFactory],
})
export class VocabularyModule {}
