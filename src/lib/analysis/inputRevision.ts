const REVISION_VERSION = 'analysis-input-v1';

/**
 * Produces a stable revision for the exact resume/job pair. Length delimiters
 * prevent ambiguous concatenations and SHA-256 keeps persisted session records
 * compact without retaining another copy of either input.
 */
export async function createAnalysisInputRevision(
  resumeText: string,
  jobDescriptionText: string
): Promise<string> {
  const payload = [
    REVISION_VERSION,
    resumeText.length.toString(),
    resumeText,
    jobDescriptionText.length.toString(),
    jobDescriptionText,
  ].join('\u0000');
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(payload)
  );
  const hex = Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0')
  ).join('');

  return `sha256:${hex}`;
}
