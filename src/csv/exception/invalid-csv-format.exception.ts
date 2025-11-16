import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Exception thrown when CSV file has invalid format or data
 */
export class InvalidCsvFormatException extends HttpException {
  constructor(message: string, rowNumber?: number) {
    const errorMessage = rowNumber
      ? `Invalid CSV format at row ${rowNumber}: ${message}`
      : `Invalid CSV format: ${message}`;

    super(errorMessage, HttpStatus.BAD_REQUEST);
  }
}
