/**
 * Vercel sends CRON_SECRET as a bearer token. Missing configuration must fail
 * closed so an unset secret can never authorize an empty or guessed header.
 */
export function isAuthorizedCronRequest(
  authorizationHeader: string | null,
  cronSecret: string | undefined
): boolean {
  if (!cronSecret || cronSecret.trim().length === 0) return false;
  return authorizationHeader === `Bearer ${cronSecret}`;
}
