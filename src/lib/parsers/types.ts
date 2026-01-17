/**
 * Parser-specific types for PDF and DOCX text extraction.
 */

/**
 * A single text item extracted from a PDF, including position data.
 * Position data is crucial for detecting multi-column layouts.
 */
export type PdfTextItem = {
  /** The text string content */
  str: string;
  /** X coordinate (horizontal position) */
  x: number;
  /** Y coordinate (vertical position) */
  y: number;
  /** Width of the text item */
  width: number;
  /** Height of the text item */
  height: number;
  /** Font name (if available) */
  fontName?: string;
  /** Transform matrix from PDF.js */
  transform: number[];
};

/**
 * Represents a single parsed PDF page with text and positional data.
 */
export type ParsedPdfPage = {
  /** Page number (1-indexed) */
  pageNumber: number;
  /** Combined text content of the page */
  text: string;
  /** Individual text items with positions */
  items: PdfTextItem[];
  /** Page dimensions */
  width: number;
  height: number;
};

/**
 * Complete result from PDF parsing.
 */
export type ParsedPdf = {
  /** All pages */
  pages: ParsedPdfPage[];
  /** Combined text from all pages */
  fullText: string;
  /** Total page count */
  pageCount: number;
  /** Warnings generated during parsing */
  warnings: ParserWarning[];
};

/**
 * Warning generated during parsing.
 */
export type ParserWarning = {
  /** Warning code */
  code: string;
  /** Human-readable message */
  message: string;
  /** Page number (if applicable) */
  pageNumber?: number;
};

/**
 * Messages sent to the PDF Web Worker.
 */
export type PdfWorkerMessage = {
  type: 'parse';
  /** ArrayBuffer of the PDF file */
  data: ArrayBuffer;
  /** Original filename */
  fileName: string;
};

/**
 * Messages received from the PDF Web Worker.
 */
export type PdfWorkerResponse =
  | {
      type: 'progress';
      /** Current page being processed */
      currentPage: number;
      /** Total pages */
      totalPages: number;
    }
  | {
      type: 'success';
      /** Parsed result */
      result: ParsedPdf;
    }
  | {
      type: 'error';
      /** Error message */
      message: string;
      /** Error code */
      code: string;
    };

/**
 * Options for PDF parsing.
 */
export type PdfParseOptions = {
  /** Progress callback */
  onProgress?: (current: number, total: number) => void;
  /** Maximum pages to process (for performance) */
  maxPages?: number;
};

/**
 * Result from DOCX parsing.
 */
export type ParsedDocx = {
  /** Extracted plain text */
  text: string;
  /** HTML representation (from mammoth) */
  html: string;
  /** Warnings from conversion */
  warnings: ParserWarning[];
  /** Paragraph count */
  paragraphCount: number;
};
