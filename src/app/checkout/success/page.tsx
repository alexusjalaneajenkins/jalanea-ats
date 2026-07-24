import { Suspense } from 'react';
import { CheckoutStatusPanel } from '@/components/checkout/CheckoutStatusPanel';

export default function CheckoutSuccessPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div
          className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full opacity-40"
          style={{
            background:
              'radial-gradient(circle, rgba(16,185,129,0.3) 0%, rgba(6,182,212,0.1) 40%, transparent 70%)',
          }}
        />
        <div
          className="absolute bottom-[-30%] right-[-20%] w-[70%] h-[70%] rounded-full opacity-30"
          style={{
            background:
              'radial-gradient(circle, rgba(249,115,22,0.25) 0%, rgba(236,72,153,0.1) 40%, transparent 70%)',
          }}
        />
        <div className="absolute inset-0 bg-grid opacity-[0.04]" />
      </div>

      <Suspense fallback={<p className="text-center text-indigo-300">Verifying checkout…</p>}>
        <CheckoutStatusPanel />
      </Suspense>
    </main>
  );
}
