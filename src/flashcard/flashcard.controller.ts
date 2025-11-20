import {
  Controller,
  Get,
  Param,
  Query,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import {
  ProcessResponseDto,
  ProcessedEntryDto,
} from './dto/process-response.dto';
import { PackService } from '../database/services/pack.service';
import { DeckService } from '../database/services/deck.service';
import { FlashcardProcessingService } from './flashcard-processor.service';

/**
 * Controller for flashcard processing endpoints
 */
@Controller('api')
export class FlashcardController {
  private readonly logger = new Logger(FlashcardController.name);

  constructor(
    private readonly flashcardProcessingService: FlashcardProcessingService,
    private readonly packService: PackService,
    private readonly deckService: DeckService,
  ) {}

  /**
   * Processes a CSV file and generates flashcard data
   * GET /api/process/{csvLocation}?deckId={deckId}
   * @param csvLocation - Unix path to CSV file (URL encoded)
   * @param deckId - Target deck ID (query parameter)
   * @returns Processing results
   */
  @Get('process/:csvLocation(*)')
  async processFlashcards(
    @Param('csvLocation') csvLocation: string,
    @Query('packId') packId: string,
    @Query('deckId') deckId: string,
  ): Promise<ProcessResponseDto> {
    this.logger.log(`Received request to process CSV: ${csvLocation}`);

    if (!packId) {
      throw new HttpException(
        'packId query parameter is required',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!deckId) {
      throw new HttpException(
        'deckId query parameter is required',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      // Validate deck exists
      const pack = await this.packService.findById(packId);
      if (!pack) {
        throw new HttpException(
          `Deck with ID ${packId} not found`,
          HttpStatus.NOT_FOUND,
        );
      }

      // Validate deck exists
      const deck = await this.deckService.findById(deckId);
      if (!deck) {
        throw new HttpException(
          `Deck with ID ${deckId} not found`,
          HttpStatus.NOT_FOUND,
        );
      }

      // Validate and sanitize path
      const sanitizedPath = this.validateAndSanitizePath(csvLocation);

      // Process the file
      const summary = await this.flashcardProcessingService.processFile(
        sanitizedPath,
        packId,
        deckId,
      );

      // Transform to response DTO
      const response: ProcessResponseDto = {
        success: summary.failureCount === 0,
        message:
          summary.failureCount === 0
            ? `Successfully processed ${summary.successCount} entries (${summary.skippedCount} skipped as duplicates)`
            : `Processed ${summary.totalRows} entries: ${summary.successCount} succeeded, ${summary.failureCount} failed, ${summary.skippedCount} skipped`,
        summary: {
          totalRows: summary.totalRows,
          successCount: summary.successCount,
          failureCount: summary.failureCount,
          skippedCount: summary.skippedCount,
          processingTimeMs: summary.processingTimeMs,
        },
        results: summary.results.map((result) => ({
          word: result.entry.word,
          type: result.entry.type,
          rowNumber: result.entry.rowNumber,
          success: result.success,
          skipped: result.skipped,
          reason: result.reason,
          data: result.data,
          error: result.error,
        })),
      };

      this.logger.log(
        `Request completed: ${summary.successCount} new cards, ${summary.skippedCount} skipped`,
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
   * Get all packs
   * GET /api/packs
   */
  @Get('packs')
  async getPacks() {
    return await this.packService.findAll();
  }

  /**
   * Get all decks for a pack
   * GET /api/packs/:packId/decks
   */
  @Get('packs/:packId/decks')
  async getDecks(@Param('packId') packId: string) {
    return await this.deckService.findByPackId(packId);
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
