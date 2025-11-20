import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { createReadStream } from 'fs';
import { access, constants } from 'fs/promises';
import csv from 'csv-parser';
import { VocabularyEntryDto } from '../common/dto/vocabulary-entry.dto';
import {
  fromStringToVocabularyTypeEnum,
  VocabularyType,
} from '../common/enum/vocabulary-type.enum';
import { CsvParseException } from './exception/csv-parse.exception';
import { InvalidCsvFormatException } from './exception/invalid-csv-format.exception';

/**
 * Service for reading and parsing CSV files containing German vocabulary
 */
@Injectable()
export class CsvService {
  private readonly logger = new Logger(CsvService.name);

  /**
   * Reads and parses a CSV file containing vocabulary entries
   * @param filePath - Unix path to the CSV file
   * @returns Promise resolving to array of vocabulary entries
   */
  async readCsv(filePath: string): Promise<VocabularyEntryDto[]> {
    this.logger.log(`Starting to read CSV file: ${filePath}`);

    // Validate file path first
    await this.validateFilePath(filePath);

    const entries: VocabularyEntryDto[] = [];
    let rowNumber = 0;

    return new Promise((resolve, reject) => {
      createReadStream(filePath)
        .pipe(csv())
        .on('data', (row) => {
          rowNumber++;
          try {
            const entry = this.validateCsvRow(row, rowNumber);
            entries.push(entry);
          } catch (error) {
            reject(error);
          }
        })
        .on('end', () => {
          this.logger.log(
            `Completed reading CSV file: ${filePath}. Processed ${entries.length} rows.`,
          );
          resolve(entries);
        })
        .on('error', (error) => {
          this.logger.error(`Error reading CSV file: ${filePath}`, error.stack);
          reject(new CsvParseException(error.message, filePath));
        });
    });
  }

  /**
   * Validates that the file path is valid and accessible
   * @param filePath - Path to validate
   * @throws NotFoundException if file doesn't exist
   * @throws CsvParseException if file is not accessible or not a CSV
   */
  private async validateFilePath(filePath: string): Promise<void> {
    // Check if file has .csv extension
    if (!filePath.toLowerCase().endsWith('.csv')) {
      throw new CsvParseException('File must have .csv extension', filePath);
    }

    try {
      // Check if file exists and is readable
      await access(filePath, constants.R_OK);
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new NotFoundException(`CSV file not found: ${filePath}`);
      }
      throw new CsvParseException(
        `File is not accessible: ${error.message}`,
        filePath,
      );
    }
  }

  /**
   * Validates a single CSV row and converts it to VocabularyEntryDto
   * @param row - Raw row data from CSV parser
   * @param rowNumber - Row number for error reporting
   * @returns Validated VocabularyEntryDto
   * @throws InvalidCsvFormatException if row is invalid
   */
  private validateCsvRow(row: any, rowNumber: number): VocabularyEntryDto {
    // Check for required columns (case-insensitive)
    const typeKey = Object.keys(row).find(
      (key) => key.toLowerCase() === 'type',
    );
    const wordKey = Object.keys(row).find(
      (key) => key.toLowerCase() === 'word',
    );

    // if (!typeKey) {
    //   throw new InvalidCsvFormatException(
    //     'Missing required column: type',
    //     rowNumber,
    //   );
    // }

    if (!wordKey) {
      throw new InvalidCsvFormatException(
        'Missing required column: word',
        rowNumber,
      );
    }

    // Get and trim values
    const type = row[typeKey]?.toString().trim().toLowerCase();
    const word = row[wordKey]?.toString().trim();

    // Validate type column
    // if (!type) {
    //   throw new InvalidCsvFormatException(
    //     'Type column cannot be empty',
    //     rowNumber,
    //   );
    // }

    // if (type !== 'verb' && type !== 'noun') {
    //   throw new InvalidCsvFormatException(
    //     `Invalid type value: '${type}'. Must be 'verb' or 'noun'`,
    //     rowNumber,
    //   );
    // }

    // Validate word column
    if (!word) {
      throw new InvalidCsvFormatException(
        'Word column cannot be empty',
        rowNumber,
      );
    }

    const typeEnum = !typeKey
      ? VocabularyType.UNSET
      : fromStringToVocabularyTypeEnum(type);

    return {
      type: typeEnum,
      word,
      rowNumber,
    };
  }
}
