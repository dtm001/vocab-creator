import { Injectable, Logger } from '@nestjs/common';
import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Service for making HTTP requests to external dictionary websites
 * Handles retries, timeouts, and rate limiting
 */
@Injectable()
export class HttpClientService {
  private readonly logger = new Logger(HttpClientService.name);
  private readonly BASE_URL = 'https://www.verbformen.com';
  private readonly TIMEOUT_MS = 10000; // 10 seconds
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY_MS = 1000; // 1 second between retries

  /**
   * Fetches HTML content for a German word from the dictionary website
   * @param word - The German word to look up
   * @param type - The vocabulary type (for URL construction if needed)
   * @returns Promise resolving to raw HTML string
   * @throws HttpException if request fails after retries
   */
  async fetchWordHtml(word: string, type?: string): Promise<string> {
    const url = `${this.BASE_URL}/?w=${encodeURIComponent(word)}`;
    this.logger.log(`Fetching HTML for word: ${word} from ${url}`);

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        const html = await this.makeRequest(url);
        this.logger.log(`Successfully fetched HTML for word: ${word}`);
        return html;
      } catch (error) {
        lastError = error;
        this.logger.warn(
          `Attempt ${attempt}/${this.MAX_RETRIES} failed for ${word}: ${error.message}`,
        );

        if (attempt < this.MAX_RETRIES) {
          await this.delay(this.RETRY_DELAY_MS * attempt); // Exponential backoff
        }
      }
    }

    this.logger.error(
      `All ${this.MAX_RETRIES} attempts failed for word: ${word}`,
    );
    throw new HttpException(
      `Failed to fetch data for word '${word}' after ${this.MAX_RETRIES} attempts: ${lastError?.message}`,
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  }

  /**
   * Makes the actual HTTP request with timeout
   * @param url - URL to fetch
   * @returns Promise resolving to response text
   */
  private async makeRequest(url: string): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; GermanFlashcardBot/1.0)',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.text();
    } catch (error) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        throw new Error(`Request timeout after ${this.TIMEOUT_MS}ms`);
      }

      throw error;
    }
  }

  /**
   * Delays execution for rate limiting and retry backoff
   * @param ms - Milliseconds to delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
