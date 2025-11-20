import { Module } from '@nestjs/common';
import { HttpClientService } from './http-client.service';
import { VerbHandler } from './verb.handler';
import { NounHandler } from './noun.handler';
import { VocabularyHandlerFactory } from './vocabulary-handler.factory';
import { VocabularyTypeService } from './vocabulary-type.service';
import { AdjectiveHandler } from './adjective.handler';
import { DefaultHandler } from './default.handler';

/**
 * Module for vocabulary processing functionality
 */
@Module({
  providers: [
    HttpClientService,
    VerbHandler,
    NounHandler,
    AdjectiveHandler,
    DefaultHandler,
    VocabularyHandlerFactory,
    VocabularyTypeService,
  ],
  exports: [VocabularyHandlerFactory, VocabularyTypeService, HttpClientService],
})
export class VocabularyModule {}
