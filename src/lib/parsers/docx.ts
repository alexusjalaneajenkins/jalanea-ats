/**
 * DOCX Parser Module
 *
 * Extracts text from DOCX files using mammoth.js.
 * Converts DOCX to HTML/text while preserving structure.
 */

import { ResumeArtifact, ExtractionMeta } from '../types/session';
import { ParserWarning } from './types';

/**
 * Parses a DOCX file and extracts text.
 * Uses mammoth.js for browser-based parsing.
 */
export async function parseDocx(file: File): Promise<ResumeArtifact> {
  // Validate file type
  const validTypes = [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
  ];
  const isValidType =
    validTypes.includes(file.type) ||
    file.name.toLowerCase().endsWith('.docx') ||
    file.name.toLowerCase().endsWith('.doc');

  if (!isValidType) {
    throw new DocxParseError(
      'Invalid file type. Please upload a DOCX file.',
      'INVALID_TYPE'
    );
  }

  // Check file size (10MB limit)
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    throw new DocxParseError(
      'File is too large. Please upload a DOCX under 10MB.',
      'FILE_TOO_LARGE'
    );
  }

  // Warn about .doc files (older format)
  if (file.name.toLowerCase().endsWith('.doc')) {
    throw new DocxParseError(
      'Old .doc format detected. Please save as .docx for best results.',
      'OLD_FORMAT'
    );
  }

  try {
    // Load mammoth dynamically
    const mammoth = await import('mammoth');

    // Read file as ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();

    // Convert DOCX to HTML and plain text
    const [htmlResult, textResult] = await Promise.all([
      mammoth.convertToHtml({ arrayBuffer }),
      mammoth.extractRawText({ arrayBuffer }),
    ]);

    const warnings: ParserWarning[] = [];

    // Collect mammoth warnings
    if (htmlResult.messages && htmlResult.messages.length > 0) {
      htmlResult.messages.forEach((msg: { type: string; message: string }) => {
        if (msg.type === 'warning') {
          warnings.push({
            code: 'MAMMOTH_WARNING',
            message: msg.message,
          });
        }
      });
    }

    const extractedText = textResult.value.trim();

    // Check for low content
    if (extractedText.length < 50) {
      warnings.push({
        code: 'LOW_TEXT_CONTENT',
        message:
          'Very little text was extracted. The document may be mostly images or empty.',
      });
    }

    // Count paragraphs (rough estimate)
    const paragraphCount = extractedText.split(/\n\s*\n/).filter((p) => p.trim()).length;

    // Build extraction metadata
    const extractionMeta: ExtractionMeta = {
      charCount: extractedText.length,
      extractionWarnings: warnings.map((w) => w.message),
      // DOCX doesn't have the same layout signals as PDF
      // We'll detect sections and structure in the analysis phase
    };

    return {
      fileName: file.name,
      fileType: 'docx',
      fileSizeBytes: file.size,
      extractedText,
      extractionMeta,
    };
  } catch (error) {
    if (error instanceof DocxParseError) {
      throw error;
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (errorMessage.includes('Could not find')) {
      throw new DocxParseError(
        'This file appears to be corrupted or is not a valid DOCX.',
        'INVALID_DOCX'
      );
    }

    throw new DocxParseError(`Failed to parse DOCX: ${errorMessage}`, 'PARSE_ERROR');
  }
}

/**
 * Custom error class for DOCX parsing errors.
 */
export class DocxParseError extends Error {
  code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'DocxParseError';
    this.code = code;
  }
}
