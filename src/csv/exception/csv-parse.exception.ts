import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Exception thrown when CSV file cannot be parsed
 */
export class CsvParseException extends HttpException {
  constructor(message: string, filePath?: string) {
    const errorMessage = filePath
      ? `Failed to parse CSV file '${filePath}': ${message}`
      : `Failed to parse CSV file: ${message}`;

    super(errorMessage, HttpStatus.BAD_REQUEST);
  }
}
