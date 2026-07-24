export interface PositionedPdfText {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface TextSegment {
  text: string;
  x: number;
  endX: number;
  y: number;
}

interface TextLine {
  y: number;
  items: PositionedPdfText[];
  segments: TextSegment[];
}

function joinTokens(items: PositionedPdfText[]): string {
  return items
    .map((item) => item.str.trim())
    .filter(Boolean)
    .join(' ')
    .replace(/\s+([,.;:!?%)\]])/g, '$1')
    .replace(/([(/\[$])\s+/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildLines(
  items: PositionedPdfText[],
  pageWidth: number
): TextLine[] {
  const cleanItems = items
    .filter(
      (item) =>
        item.str.trim() &&
        Number.isFinite(item.x) &&
        Number.isFinite(item.y)
    )
    .sort((a, b) => b.y - a.y || a.x - b.x);
  const lines: TextLine[] = [];

  for (const item of cleanItems) {
    const tolerance = Math.max(
      2,
      Math.min(6, Math.abs(item.height || 0) * 0.5)
    );
    const line = lines.find(
      (candidate) => Math.abs(candidate.y - item.y) <= tolerance
    );
    if (line) {
      line.items.push(item);
      line.y =
        line.items.reduce((sum, candidate) => sum + candidate.y, 0) /
        line.items.length;
    } else {
      lines.push({ y: item.y, items: [item], segments: [] });
    }
  }

  const columnGap = Math.max(36, pageWidth * 0.12);
  for (const line of lines) {
    line.items.sort((a, b) => a.x - b.x);
    const itemGroups: PositionedPdfText[][] = [];
    for (const item of line.items) {
      const currentGroup = itemGroups[itemGroups.length - 1];
      const previous = currentGroup?.[currentGroup.length - 1];
      const previousEnd = previous
        ? previous.x + Math.max(0, previous.width)
        : 0;
      if (previous && item.x - previousEnd <= columnGap) {
        currentGroup.push(item);
      } else {
        itemGroups.push([item]);
      }
    }

    line.segments = itemGroups
      .map((group) => ({
        text: joinTokens(group),
        x: group[0]?.x ?? 0,
        endX: Math.max(
          ...group.map((item) => item.x + Math.max(0, item.width))
        ),
        y: line.y,
      }))
      .filter((segment) => segment.text);
  }

  return lines.sort((a, b) => b.y - a.y);
}

function detectColumnSplit(
  lines: TextLine[],
  pageWidth: number
): number | null {
  const gapThreshold = Math.max(60, pageWidth * 0.16);
  const rowSplits = lines.flatMap((line) =>
    line.segments.slice(1).flatMap((segment, index) => {
      const previous = line.segments[index];
      const gap = segment.x - previous.endX;
      return gap >= gapThreshold
        ? [(previous.endX + segment.x) / 2]
        : [];
    })
  );

  if (rowSplits.length >= 2) {
    return rowSplits.sort((a, b) => a - b)[
      Math.floor(rowSplits.length / 2)
    ];
  }

  const starts = lines
    .flatMap((line) => line.segments.map((segment) => segment.x))
    .sort((a, b) => a - b);
  let bestGap = 0;
  let bestIndex = -1;
  for (let index = 1; index < starts.length; index += 1) {
    const gap = starts[index] - starts[index - 1];
    if (
      gap > bestGap &&
      gap >= pageWidth * 0.22 &&
      index >= 2 &&
      starts.length - index >= 2
    ) {
      bestGap = gap;
      bestIndex = index;
    }
  }

  return bestIndex === -1
    ? null
    : (starts[bestIndex - 1] + starts[bestIndex]) / 2;
}

function sortTopDown(segments: TextSegment[]): TextSegment[] {
  return [...segments].sort((a, b) => b.y - a.y || a.x - b.x);
}

/**
 * Reconstructs coordinate-aware PDF text.
 *
 * One-column pages are read line-by-line, top-to-bottom. When a stable
 * two-column split is detected, full-width headers are emitted first,
 * followed by the left column top-to-bottom, then the right column
 * top-to-bottom, and finally full-width footer content.
 */
export function reconstructPdfPageText(
  items: PositionedPdfText[],
  pageWidth: number
): string {
  const lines = buildLines(items, pageWidth);
  if (lines.length === 0) return '';

  const split = detectColumnSplit(lines, pageWidth);
  if (split === null) {
    return lines
      .map((line) => line.segments.map((segment) => segment.text).join(' '))
      .filter(Boolean)
      .join('\n');
  }

  const segments = lines.flatMap((line) => line.segments);
  const fullWidth = segments.filter(
    (segment) =>
      (segment.x < split && segment.endX > split) ||
      segment.endX - segment.x >= pageWidth * 0.65
  );
  const columnSegments = segments.filter(
    (segment) => !fullWidth.includes(segment)
  );
  const left = columnSegments.filter((segment) => segment.x < split);
  const right = columnSegments.filter((segment) => segment.x >= split);

  if (left.length < 2 || right.length < 2) {
    return lines
      .map((line) => line.segments.map((segment) => segment.text).join(' '))
      .filter(Boolean)
      .join('\n');
  }

  const topOfColumns = Math.min(
    Math.max(...left.map((segment) => segment.y)),
    Math.max(...right.map((segment) => segment.y))
  );
  const bottomOfColumns = Math.max(
    Math.min(...left.map((segment) => segment.y)),
    Math.min(...right.map((segment) => segment.y))
  );
  const header = fullWidth.filter((segment) => segment.y > topOfColumns);
  const footer = fullWidth.filter((segment) => segment.y < bottomOfColumns);
  const middleFullWidth = fullWidth.filter(
    (segment) => segment.y <= topOfColumns && segment.y >= bottomOfColumns
  );

  return [
    ...sortTopDown(header),
    ...sortTopDown(left),
    ...sortTopDown(middleFullWidth),
    ...sortTopDown(right),
    ...sortTopDown(footer),
  ]
    .map((segment) => segment.text)
    .filter(Boolean)
    .join('\n');
}
