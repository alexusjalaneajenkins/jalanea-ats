/**
 * PDF Parser Module
 *
 * Extracts text from PDF files using PDF.js in a Web Worker.
 * Captures positional data for layout analysis (column detection).
 */

import { ResumeArtifact, ExtractionMeta, PdfLayoutSignals } from '../types/session';
import {
  ParsedPdf,
  ParsedPdfPage,
  PdfTextItem,
  PdfParseOptions,
  ParserWarning,
} from './types';

// PDF.js types - use `any` to avoid version-specific type incompatibilities
// The actual types from pdfjs-dist change between versions, so we use
// loose typing here and ensure the runtime code works correctly.
/* eslint-disable @typescript-eslint/no-explicit-any */
type PDFDocumentProxy = any;
type PDFPageProxy = any;
type TextContent = any;
type TextItem = {
  str: string;
  transform: number[];
  width: number;
  height: number;
  fontName?: string;
};
/* eslint-enable @typescript-eslint/no-explicit-any */

/**
 * Parses a PDF file and extracts text with positional data.
 * Uses PDF.js for browser-based parsing (no server upload required).
 */
export async function parsePdf(
  file: File,
  options: PdfParseOptions = {}
): Promise<ResumeArtifact> {
  const { onProgress, maxPages = 20 } = options;

  // Validate file type
  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
    throw new PdfParseError('Invalid file type. Please upload a PDF file.', 'INVALID_TYPE');
  }

  // Check file size (10MB limit)
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    throw new PdfParseError(
      'File is too large. Please upload a PDF under 10MB.',
      'FILE_TOO_LARGE'
    );
  }

  try {
    // Load PDF.js dynamically (client-side only)
    const pdfjsLib = await loadPdfJs();

    // Read file as ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();

    // Load the PDF document
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf: PDFDocumentProxy = await loadingTask.promise;

    const pageCount = Math.min(pdf.numPages, maxPages);
    const pages: ParsedPdfPage[] = [];
    const warnings: ParserWarning[] = [];

    // If we're limiting pages, add a warning
    if (pdf.numPages > maxPages) {
      warnings.push({
        code: 'PAGES_TRUNCATED',
        message: `Only processing first ${maxPages} pages of ${pdf.numPages} total pages.`,
      });
    }

    // Extract text from each page
    for (let i = 1; i <= pageCount; i++) {
      if (onProgress) {
        onProgress(i, pageCount);
      }

      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 1.0 });
      const textContent = await page.getTextContent();

      const items: PdfTextItem[] = textContent.items.map((item: TextItem) => ({
        str: item.str,
        x: item.transform[4], // X position from transform matrix
        y: item.transform[5], // Y position from transform matrix
        width: item.width,
        height: item.height,
        fontName: item.fontName,
        transform: item.transform,
      }));

      // Combine text in reading order (top to bottom, left to right)
      const sortedItems = [...items].sort((a, b) => {
        // Sort by Y (descending - PDF coordinates start at bottom)
        // then by X (ascending)
        const yDiff = b.y - a.y;
        if (Math.abs(yDiff) > 5) return yDiff; // 5pt tolerance for same line
        return a.x - b.x;
      });

      const pageText = sortedItems.map((item) => item.str).join(' ');

      pages.push({
        pageNumber: i,
        text: pageText,
        items,
        width: viewport.width,
        height: viewport.height,
      });
    }

    // Combine all text
    const fullText = pages.map((p) => p.text).join('\n\n');

    // Check for potential issues
    if (fullText.trim().length < 50) {
      warnings.push({
        code: 'LOW_TEXT_CONTENT',
        message:
          'Very little text was extracted. This PDF may be image-based or scanned.',
      });
    }

    // Analyze layout signals
    const pdfSignals = analyzeLayout(pages, file.size);

    // Build extraction metadata
    const extractionMeta: ExtractionMeta = {
      charCount: fullText.length,
      pageCount: pdf.numPages,
      extractionWarnings: warnings.map((w) => w.message),
      pdfSignals,
    };

    return {
      fileName: file.name,
      fileType: 'pdf',
      fileSizeBytes: file.size,
      extractedText: fullText,
      extractionMeta,
    };
  } catch (error) {
    if (error instanceof PdfParseError) {
      throw error;
    }

    // Handle PDF.js specific errors
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (errorMessage.includes('password')) {
      throw new PdfParseError(
        'This PDF is password-protected. Please upload an unlocked version.',
        'PASSWORD_PROTECTED'
      );
    }

    if (errorMessage.includes('Invalid PDF')) {
      throw new PdfParseError(
        'This file appears to be corrupted or is not a valid PDF.',
        'INVALID_PDF'
      );
    }

    throw new PdfParseError(`Failed to parse PDF: ${errorMessage}`, 'PARSE_ERROR');
  }
}

/**
 * Dynamically loads PDF.js library (client-side only).
 */
async function loadPdfJs() {
  // Dynamic import for client-side only
  const pdfjsLib = await import('pdfjs-dist');

  // Set up the worker - use local file from public folder
  if (typeof window !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
  }

  return pdfjsLib;
}

/**
 * Analyzes PDF layout to detect potential parsing issues.
 */
function analyzeLayout(pages: ParsedPdfPage[], fileSize: number): PdfLayoutSignals {
  const pagesToCheck = pages.slice(0, Math.min(3, pages.length));
  const pagesWithItems = pagesToCheck.filter((page) => page.items.length > 0);

  if (pagesWithItems.length === 0) {
    return {
      estimatedColumns: 1,
      columnMergeRisk: 'low',
      headerContactRisk: 'low',
      textDensity: 'low',
    };
  }

  const columnSignals = pagesWithItems.map((page) => detectColumns(page));
  const headerSignals = pagesWithItems.map((page) => analyzeHeaderRisk(page));

  const riskRank: Record<'low' | 'medium' | 'high', number> = {
    low: 0,
    medium: 1,
    high: 2,
  };

  const estimatedColumns = Math.max(...columnSignals.map((signal) => signal.columns)) as 1 | 2 | 3;
  const columnMergeRisk = columnSignals.reduce<'low' | 'medium' | 'high'>((current, signal) => {
    return riskRank[signal.risk] > riskRank[current] ? signal.risk : current;
  }, 'low');

  const headerContactRisk = headerSignals.reduce<'low' | 'medium' | 'high'>((current, risk) => {
    return riskRank[risk] > riskRank[current] ? risk : current;
  }, 'low');

  // Text density - ratio of text bytes to file size
  const totalTextBytes = pages.reduce((sum, p) => sum + p.text.length, 0);
  const densityRatio = totalTextBytes / fileSize;
  const textDensity: 'low' | 'medium' | 'high' =
    densityRatio < 0.01 ? 'low' : densityRatio < 0.05 ? 'medium' : 'high';

  return {
    estimatedColumns,
    columnMergeRisk,
    headerContactRisk,
    textDensity,
  };
}

/**
 * Detects multi-column layouts in a PDF page.
 *
 * Improved algorithm that:
 * 1. Looks for consistent left-margin starting positions
 * 2. Requires significant, sustained gaps to indicate true columns
 * 3. Ignores minor variations from indentation, bullet points, etc.
 */
function detectColumns(page: ParsedPdfPage): {
  columns: 1 | 2 | 3;
  risk: 'low' | 'medium' | 'high';
} {
  const items = page.items;
  if (items.length < 10) {
    return { columns: 1, risk: 'low' };
  }

  const pageWidth = page.width;

  // Step 1: Find the dominant left margin(s)
  // True columns will have text starting at consistent X positions
  const leftMargins = findLeftMargins(items, pageWidth);

  // Step 2: Analyze if there are truly parallel content streams
  const columnAnalysis = analyzeColumnStreams(items, leftMargins, pageWidth);

  return columnAnalysis;
}

/**
 * Finds the dominant left margin positions where text blocks start.
 * Single-column docs typically have 1-2 margins (main + indented).
 * Multi-column docs have distinct margin clusters in different page regions.
 */
function findLeftMargins(items: PdfTextItem[], pageWidth: number): number[] {
  // Get starting X positions of text items (left edge)
  const startPositions = items.map((item) => item.x);

  // Cluster X positions with tolerance for minor variations
  const tolerance = pageWidth * 0.02; // 2% tolerance
  const clusters: number[][] = [];

  startPositions.forEach((x) => {
    // Find if there's an existing cluster this belongs to
    let foundCluster = false;
    for (const cluster of clusters) {
      const clusterAvg = cluster.reduce((a, b) => a + b, 0) / cluster.length;
      if (Math.abs(x - clusterAvg) < tolerance) {
        cluster.push(x);
        foundCluster = true;
        break;
      }
    }
    if (!foundCluster) {
      clusters.push([x]);
    }
  });

  // Get cluster centers, sorted by frequency (most common first)
  const clusterCenters = clusters
    .filter((c) => c.length >= 3) // Only clusters with 3+ items
    .map((c) => ({
      center: c.reduce((a, b) => a + b, 0) / c.length,
      count: c.length,
    }))
    .sort((a, b) => b.count - a.count)
    .map((c) => c.center);

  return clusterCenters;
}

/**
 * Analyzes whether left margins represent true parallel columns
 * or just normal document structure (main text + indentation).
 */
function analyzeColumnStreams(
  items: PdfTextItem[],
  leftMargins: number[],
  pageWidth: number
): { columns: 1 | 2 | 3; risk: 'low' | 'medium' | 'high' } {
  if (leftMargins.length < 2) {
    return { columns: 1, risk: 'low' };
  }

  // Check if margins are in truly separate regions of the page
  // (left half vs right half for 2-column, thirds for 3-column)
  const pageCenter = pageWidth / 2;
  const pageThird1 = pageWidth / 3;
  const pageThird2 = (pageWidth * 2) / 3;

  // Categorize margins by page region
  const leftRegion = leftMargins.filter((m) => m < pageThird1);
  const middleRegion = leftMargins.filter((m) => m >= pageThird1 && m < pageThird2);
  const rightRegion = leftMargins.filter((m) => m >= pageThird2);

  // For true multi-column: we need significant content starting in right regions
  // Check if there are text items consistently starting in the right half
  const itemsInRightHalf = items.filter((item) => item.x > pageCenter);
  const itemsInLeftHalf = items.filter((item) => item.x <= pageCenter);

  // Calculate the ratio of content in each half
  const rightHalfRatio = itemsInRightHalf.length / items.length;

  // Group items by Y position to see if we have parallel content on same lines
  const rowTolerance = 12;
  const rows = new Map<number, PdfTextItem[]>();
  items.forEach((item) => {
    const rowY = Math.round(item.y / rowTolerance) * rowTolerance;
    if (!rows.has(rowY)) rows.set(rowY, []);
    rows.get(rowY)!.push(item);
  });

  // Count rows that have content in BOTH left and right halves with a big gap
  let trueMultiColumnRows = 0;
  const minGapForColumn = pageWidth * 0.15; // 15% gap minimum for true columns

  rows.forEach((rowItems) => {
    if (rowItems.length < 2) return;

    const sortedByX = [...rowItems].sort((a, b) => a.x - b.x);
    const leftMost = sortedByX[0];
    const rightMost = sortedByX[sortedByX.length - 1];

    // Check if there's a significant gap in the middle of this row
    for (let i = 1; i < sortedByX.length; i++) {
      const gap = sortedByX[i].x - (sortedByX[i - 1].x + sortedByX[i - 1].width);
      if (gap > minGapForColumn) {
        // This row has a true column gap
        trueMultiColumnRows++;
        break;
      }
    }
  });

  const multiColumnRowRatio = trueMultiColumnRows / rows.size;

  // Decision logic:
  // - True 2-column: 30%+ of rows have parallel content with big gaps
  // - True 3-column: significant content in all three regions
  // - Single column with indentation: gaps are from bullet points, not columns

  if (multiColumnRowRatio > 0.3 && rightHalfRatio > 0.2) {
    // Check for 3 columns
    if (leftRegion.length > 0 && middleRegion.length > 0 && rightRegion.length > 0) {
      return { columns: 3, risk: 'high' };
    }
    return { columns: 2, risk: 'medium' };
  }

  if (multiColumnRowRatio > 0.15 && rightHalfRatio > 0.15) {
    return { columns: 2, risk: 'medium' };
  }

  // Default: single column (even if there's indentation variation)
  return { columns: 1, risk: 'low' };
}

/**
 * Analyzes risk that contact info might be in a PDF header/footer region.
 *
 * Important distinction:
 * - Contact info at the TOP of the resume content = GOOD (normal placement)
 * - Contact info ONLY in true PDF header/footer regions = BAD (may not parse)
 *
 * True PDF headers/footers are:
 * - Outside the main page margins (very top/bottom few points)
 * - Often repeating across pages
 * - Usually contain page numbers, dates, or running headers
 *
 * Contact info at the top of page 1 is NORMAL and GOOD - it's in the
 * document content, just positioned at the top where it should be.
 */
function analyzeHeaderRisk(page: ParsedPdfPage): 'low' | 'medium' | 'high' {
  const items = page.items;
  if (items.length === 0) return 'low';

  // For header risk, we're looking for contact info that's ISOLATED
  // at the very extreme edges of the page, separate from main content.
  //
  // A resume with contact info at the top followed by more content
  // is NORMAL - we only flag if contact is in a disconnected header zone.

  // Get Y positions
  const yValues = items.map((i) => i.y);
  const maxY = Math.max(...yValues);
  const minY = Math.min(...yValues);
  const contentHeight = maxY - minY;

  if (contentHeight < 100) {
    return 'low';
  }

  // Check the full text for contact info
  const fullText = items.map((i) => i.str).join(' ');
  const emailPattern = /[\w.-]+@[\w.-]+\.\w+/;
  const phonePattern = /\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;
  const linkedInPattern = /linkedin\.com/i;

  const hasEmail = emailPattern.test(fullText);
  const hasPhone = phonePattern.test(fullText);
  const hasLinkedIn = linkedInPattern.test(fullText);

  // If contact info exists anywhere in the extracted text, it's accessible
  // The "header risk" is really about PDF structural headers that might
  // not be included in text extraction at all - but if we found the text,
  // it means PDF.js extracted it successfully.

  if (hasEmail || hasPhone || hasLinkedIn) {
    // Contact info was successfully extracted - low risk
    return 'low';
  }

  // No contact info found at all - this could indicate:
  // 1. Resume genuinely missing contact info
  // 2. Contact info in an image or non-text element
  // 3. Contact info in a PDF structural header that wasn't extracted
  //
  // We'll flag this as low risk here because "missing contact" is a
  // different finding than "header risk" - we'll catch missing contact
  // in the scoring/findings engine instead.
  return 'low';
}

/**
 * Custom error class for PDF parsing errors.
 */
export class PdfParseError extends Error {
  code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'PdfParseError';
    this.code = code;
  }
}
