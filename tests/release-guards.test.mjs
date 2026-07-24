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

test('release hygiene and secret scans include untracked deployable files', async () => {
  const [hygiene, secrets] = await Promise.all([
    read('scripts/check-release-hygiene.mjs'),
    read('scripts/check-secrets.mjs'),
  ]);

  for (const source of [hygiene, secrets]) {
    assert.match(source, /'--cached', '--others', '--exclude-standard'/);
  }

  assert.match(hygiene, /\[\^\/\]\* 2\\\./);
  assert.equal(
    hygiene.includes("file.startsWith('supabase/.temp/')"),
    true
  );
  assert.match(secrets, /Stripe secret key/);
  assert.match(secrets, /Supabase secret key/);
  assert.match(secrets, /Resend API key/);
});

test('CI browser tests run the already-built production server', async () => {
  const [workflow, playwright] = await Promise.all([
    read('.github/workflows/verify.yml'),
    read('playwright.config.ts'),
  ]);

  assert.match(workflow, /Build production application[\s\S]*yarn build/);
  assert.match(playwright, /isCI[\s\S]*yarn start/);
  assert.match(playwright, /yarn dev/);
});
