import { Module } from '@nestjs/common';
import { CsvService } from './csv.service';

/**
 * Module for CSV file processing functionality
 */
@Module({
  providers: [CsvService],
  exports: [CsvService],
})
export class CsvModule {}
