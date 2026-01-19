/**
 * TXT Parser Module
 *
 * Extracts text from plain text files.
 * Simple parser for testing and plain text resumes.
 */

import { ResumeArtifact, ExtractionMeta } from '../types/session';

/**
 * Parses a TXT file and extracts text.
 */
export async function parseTxt(file: File): Promise<ResumeArtifact> {
  // Validate file type
  const isValidType =
    file.type === 'text/plain' ||
    file.name.toLowerCase().endsWith('.txt');

  if (!isValidType) {
    throw new TxtParseError(
      'Invalid file type. Please upload a TXT file.',
      'INVALID_TYPE'
    );
  }

  // Check file size (10MB limit)
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    throw new TxtParseError(
      'File is too large. Please upload a TXT file under 10MB.',
      'FILE_TOO_LARGE'
    );
  }

  try {
    // Read file as text
    const text = await file.text();

    // Clean up the text (normalize line endings, trim)
    const cleanedText = text
      .replace(/\r\n/g, '\n')  // Normalize Windows line endings
      .replace(/\r/g, '\n')    // Normalize old Mac line endings
      .trim();

    // Count lines for metadata
    const lineCount = cleanedText.split('\n').length;

    // Build extraction metadata
    const extractionMeta: ExtractionMeta = {
      charCount: cleanedText.length,
      pageCount: 1,
      extractionWarnings: [],
    };

    // Add warning if file seems very short
    if (cleanedText.length < 100) {
      extractionMeta.extractionWarnings = [
        'Very short text file. Make sure this contains your full resume content.',
      ];
    }

    // Return the artifact
    return {
      fileName: file.name,
      fileType: 'txt',
      fileSizeBytes: file.size,
      extractedText: cleanedText,
      extractionMeta,
    };
  } catch (error) {
    if (error instanceof TxtParseError) {
      throw error;
    }

    console.error('TXT parsing error:', error);
    throw new TxtParseError(
      'Failed to read the text file. Please try again.',
      'PARSE_FAILED'
    );
  }
}

/**
 * Custom error class for TXT parsing errors.
 */
export class TxtParseError extends Error {
  code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'TxtParseError';
    this.code = code;
  }
}
