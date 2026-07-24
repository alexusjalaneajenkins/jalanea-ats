import Link from 'next/link';

const MESSAGES: Record<string, string> = {
  auth_unavailable: 'Sign-in is temporarily unavailable.',
  confirmation_failed: 'This confirmation link is invalid or expired.',
  exchange_failed: 'We could not finish signing you in. The link may be expired.',
  invalid_confirmation: 'This confirmation link is incomplete.',
  missing_code: 'The sign-in response was incomplete.',
  provider_denied: 'Sign-in was canceled or denied by the provider.',
};

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;
  const message =
    (code && MESSAGES[code]) ||
    'We could not complete that authentication request.';

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12">
      <section className="w-full max-w-md rounded-3xl border border-red-500/20 bg-indigo-950/80 p-8 text-center">
        <h1 className="text-2xl font-bold text-white">Sign-in problem</h1>
        <p className="mt-3 text-indigo-200">{message}</p>
        <div className="mt-6 flex justify-center gap-4">
          <Link href="/login" className="font-semibold text-orange-400 hover:text-orange-300">
            Try sign in again
          </Link>
          <Link href="/forgot-password" className="font-semibold text-indigo-300 hover:text-white">
            Reset password
          </Link>
        </div>
      </section>
    </main>
  );
}
