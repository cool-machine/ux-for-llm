/**
 * Text preprocessing utilities for cleaning extracted text for LLM consumption
 * Preserves case and punctuation while improving structure and readability
 */

export interface PreprocessingOptions {
  preserveOriginalStructure?: boolean;
  addFieldMarkers?: boolean;
  addHeaderMarkers?: boolean;
  normalizeWhitespace?: boolean;
}

export class TextPreprocessor {
  private static instance: TextPreprocessor;

  static getInstance(): TextPreprocessor {
    if (!TextPreprocessor.instance) {
      TextPreprocessor.instance = new TextPreprocessor();
    }
    return TextPreprocessor.instance;
  }

  /**
   * Generic text cleaning that works for any form
   * Preserves case and punctuation while improving structure
   */
  preprocessText(
    rawText: string, 
    options: PreprocessingOptions = {}
  ): string {
    const {
      preserveOriginalStructure = false,
      addFieldMarkers = true,
      addHeaderMarkers = true,
      normalizeWhitespace = true
    } = options;

    let cleaned = rawText;

    if (normalizeWhitespace) {
      // Remove excessive whitespace but preserve single spaces
      cleaned = cleaned.replace(/\s+/g, ' ');
    }

    if (addFieldMarkers) {
      // Add structure for field-like patterns (generic)
      // Matches patterns like "FIELD NAME:" or "Field Name:"
      cleaned = cleaned.replace(
        /([A-ZÀ-Ÿ][A-ZÀ-Ÿ\s]{2,})\s*:/g, 
        '\n$1:'
      );
    }

    if (addHeaderMarkers) {
      // Add paragraph breaks before likely headers (generic pattern)
      // Matches sequences of uppercase letters with spaces
      cleaned = cleaned.replace(
        /([A-ZÀ-Ÿ]{3,}[A-ZÀ-Ÿ\s]+[A-ZÀ-Ÿ]{3,})/g, 
        '\n\n$1'
      );
    }

    // Clean up multiple consecutive newlines but preserve intentional breaks
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

    // Remove leading/trailing whitespace
    cleaned = cleaned.trim();

    return cleaned;
  }

  /**
   * Specialized preprocessing for grant documents
   * Adds additional structure recognition for common grant patterns
   */
  preprocessGrantDocument(rawText: string): string {
    let cleaned = this.preprocessText(rawText);

    // Enhance grant-specific patterns
    // Match common grant section headers
    cleaned = cleaned.replace(
      /(PROJECT\s+DESCRIPTION|BUDGET\s+JUSTIFICATION|TIMELINE|OBJECTIVES|METHODOLOGY|EVALUATION|IMPACT)/gi,
      '\n\n$1\n'
    );

    // Match numbered sections (1., 2., etc.)
    cleaned = cleaned.replace(
      /(\n|^)(\d+\.\s*[A-ZÀ-Ÿ][^.\n]*)/g,
      '\n\n$2'
    );

    // Match lettered sections (a., b., etc.)
    cleaned = cleaned.replace(
      /(\n|^)([a-z]\.\s*[A-ZÀ-Ÿ][^.\n]*)/g,
      '\n\n$2'
    );

    return cleaned;
  }

  /**
   * Specialized preprocessing for form documents
   * Focuses on field identification and structure
   */
  preprocessFormDocument(rawText: string): string {
    let cleaned = this.preprocessText(rawText);

    // Enhance form-specific patterns
    // Match checkbox patterns
    cleaned = cleaned.replace(
      /(\☐|\□|\◻|\▢)\s*([A-ZÀ-Ÿ][^☐□◻▢\n]*)/g,
      '\n$2'
    );

    // Match filled checkbox patterns
    cleaned = cleaned.replace(
      /(\☑|\■|\◼|\▣|✓|✔)\s*([A-ZÀ-Ÿ][^☑■◼▣✓✔\n]*)/g,
      '\n$2'
    );

    // Match signature lines
    cleaned = cleaned.replace(
      /(Signature|Date|Name)\s*:?\s*_{3,}/gi,
      '\n$1: _______________'
    );

    return cleaned;
  }

  /**
   * Get preprocessing statistics
   */
  getPreprocessingStats(originalText: string, processedText: string) {
    const originalWords = originalText.split(/\s+/).filter(word => word.length > 0).length;
    const processedWords = processedText.split(/\s+/).filter(word => word.length > 0).length;
    const originalLines = originalText.split('\n').length;
    const processedLines = processedText.split('\n').length;

    return {
      originalWordCount: originalWords,
      processedWordCount: processedWords,
      originalLineCount: originalLines,
      processedLineCount: processedLines,
      compressionRatio: processedText.length / originalText.length,
      structureImprovement: processedLines / originalLines
    };
  }
}