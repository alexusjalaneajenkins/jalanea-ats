/**
 * Build headers for browser requests that send resume/job text to an AI route.
 * The consent acknowledgment is present only when the persisted user setting
 * supplied by the caller is currently true.
 */
export function buildAiJsonHeaders(
  hasConsented: boolean
): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (hasConsented) {
    headers['X-AI-Consent'] = 'acknowledged';
  }

  return headers;
}
