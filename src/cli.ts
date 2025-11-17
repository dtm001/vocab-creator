#!/usr/bin/env node

import { NestFactory } from '@nestjs/core';
import { CliModule } from './cli/cli.module';
import { CliService } from './cli/cli.service';

/**
 * CLI Entry Point
 */
async function bootstrap() {
  // Create NestJS application context (no HTTP server)
  const app = await NestFactory.createApplicationContext(CliModule, {
    logger: false, // Disable NestJS logging for cleaner CLI output
  });

  // Get CLI service and run
  const cliService = app.get(CliService);

  try {
    await cliService.run();
  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    process.exit(1);
  } finally {
    await app.close();
  }
}

bootstrap();
