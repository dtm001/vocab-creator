import {
  Controller,
  Get,
  Param,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { FlashcardProcessingService } from './flashcard-processor.service';
import {
  ProcessResponseDto,
  ProcessedEntryDto,
} from './dto/process-response.dto';
import {
  VerbData,
  NounData,
} from '../common/interface/vocabulary-data.interface';

/**
 * Controller for flashcard processing endpoints
 */
@Controller('api')
export class FlashcardController {
  private readonly logger = new Logger(FlashcardController.name);

  constructor(
    private readonly flashcardProcessingService: FlashcardProcessingService,
  ) {}

  /**
   * Processes a CSV file and generates flashcard data
   * GET /api/process/{csvLocation}
   * @param csvLocation - Unix path to CSV file (URL encoded)
   * @returns Processing results
   */
  @Get('process/:csvLocation(*)')
  async processFlashcards(
    @Param('csvLocation') csvLocation: string,
  ): Promise<ProcessResponseDto> {
    this.logger.log(`Received request to process CSV: ${csvLocation}`);

    try {
      // Validate and sanitize path
      const sanitizedPath = this.validateAndSanitizePath(csvLocation);

      // Process the file
      const summary = await this.flashcardProcessingService.processFile(
        sanitizedPath,
      );

      // Transform to response DTO
      const response: ProcessResponseDto = {
        success: summary.failureCount === 0,
        message:
          summary.failureCount === 0
            ? `Successfully processed all ${summary.totalRows} entries`
            : `Processed ${summary.totalRows} entries: ${summary.successCount} succeeded, ${summary.failureCount} failed`,
        summary: {
          totalRows: summary.totalRows,
          successCount: summary.successCount,
          failureCount: summary.failureCount,
          processingTimeMs: summary.processingTimeMs,
        },
        results: summary.results.map((result) => ({
          word: result.entry.word,
          type: result.entry.type,
          rowNumber: result.entry.rowNumber,
          success: result.success,
          data: result.data as VerbData | NounData | undefined,
          error: result.error,
        })),
      };

      this.logger.log(
        `Request completed: ${summary.successCount}/${summary.totalRows} succeeded`,
      );

      return response;
    } catch (error) {
      this.logger.error(`Error processing CSV: ${error.message}`, error.stack);

      // Re-throw HTTP exceptions as-is
      if (error instanceof HttpException) {
        throw error;
      }

      // Wrap other errors
      throw new HttpException(
        {
          success: false,
          message: `Failed to process CSV file: ${error.message}`,
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Validates and sanitizes the file path to prevent security issues
   * @param path - Path from request parameter
   * @returns Sanitized path
   * @throws HttpException if path is invalid
   */
  private validateAndSanitizePath(path: string): string {
    // Decode URL-encoded path
    const decodedPath = decodeURIComponent(path);

    // Security: Prevent path traversal attacks
    if (decodedPath.includes('..')) {
      throw new HttpException(
        'Invalid path: Path traversal is not allowed',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Ensure path is absolute (starts with /)
    if (!decodedPath.startsWith('/')) {
      throw new HttpException(
        'Invalid path: Path must be absolute (start with /)',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Additional validation: check for suspicious characters
    const suspiciousPattern = /[;<>|&$`]/;
    if (suspiciousPattern.test(decodedPath)) {
      throw new HttpException(
        'Invalid path: Path contains suspicious characters',
        HttpStatus.BAD_REQUEST,
      );
    }

    return decodedPath;
  }
}
