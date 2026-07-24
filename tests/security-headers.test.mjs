import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

async function read(relativePath) {
  return readFile(
    fileURLToPath(new URL(`../${relativePath}`, import.meta.url)),
    'utf8'
  );
}

test('every response receives baseline browser security headers', async () => {
  const config = await read('next.config.js');

  assert.match(config, /Strict-Transport-Security/);
  assert.match(config, /max-age=63072000; includeSubDomains; preload/);
  assert.match(config, /X-Content-Type-Options[\s\S]*nosniff/);
  assert.match(config, /X-Frame-Options[\s\S]*DENY/);
  assert.match(config, /Referrer-Policy[\s\S]*strict-origin-when-cross-origin/);
  assert.match(config, /Permissions-Policy/);
  assert.match(config, /Cross-Origin-Opener-Policy[\s\S]*same-origin-allow-popups/);
  assert.match(config, /Cross-Origin-Resource-Policy[\s\S]*same-origin/);
  assert.match(config, /source:\s*['"]\/:path\*['"]/);
});

test('proxy generates a request-specific nonce CSP and refreshes auth cookies', async () => {
  const proxy = await read('src/proxy.ts');
  const layout = await read('src/app/layout.tsx');

  assert.match(proxy, /crypto\.randomUUID\(\)/);
  assert.match(proxy, /script-src 'self' 'nonce-\$\{nonce\}' 'strict-dynamic'/);
  assert.match(proxy, /object-src 'none'/);
  assert.match(proxy, /base-uri 'self'/);
  assert.match(proxy, /frame-ancestors 'none'/);
  assert.match(proxy, /requestHeaders\.set\('x-nonce', nonce\)/);
  assert.match(proxy, /response\.headers\.set\('Content-Security-Policy'/);
  assert.match(proxy, /createServerClient\(/);
  assert.match(proxy, /await supabase\.auth\.getUser\(\)/);

  // Next reads the nonce from the request CSP when rendering dynamic pages.
  assert.match(layout, /await connection\(\)/);
});

test('the CSP permits only the external services used by the application', async () => {
  const proxy = await read('src/proxy.ts');

  assert.match(proxy, /https:\/\/\*\.supabase\.co/);
  assert.match(proxy, /wss:\/\/\*\.supabase\.co/);
  assert.match(proxy, /https:\/\/generativelanguage\.googleapis\.com/);
  assert.match(proxy, /https:\/\/js\.stripe\.com/);
  assert.match(proxy, /https:\/\/hooks\.stripe\.com/);
  assert.doesNotMatch(proxy, /script-src[^;\n]*'unsafe-inline'/);
});
