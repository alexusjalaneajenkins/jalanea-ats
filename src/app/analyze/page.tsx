import { redirect } from 'next/navigation';

/**
 * Analyze page - Redirects to home page
 * The analyze functionality is now at the root URL.
 */
export default function AnalyzePage() {
  redirect('/');
}
