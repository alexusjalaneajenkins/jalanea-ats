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

test('shared dialog uses the native modal stack and restores page state', async () => {
  const source = await read('src/components/ui/Dialog.tsx');

  assert.match(source, /dialog\.showModal\(\)/);
  assert.match(source, /document\.body\.style\.overflow = 'hidden'/);
  assert.match(source, /previousFocusRef\.current\?\.focus\(\)/);
  assert.match(source, /onCancel=/);
  assert.match(source, /onKeyDown=\{handleKeyDown\}/);
  assert.match(source, /event\.key !== 'Tab'/);
  assert.match(source, /event\.preventDefault\(\)/);
  assert.match(source, /aria-labelledby=/);
  assert.match(source, /aria-describedby=/);
  assert.match(source, /role\?: 'dialog' \| 'alertdialog'/);
});

test('consent and onboarding use the shared focus-contained dialog', async () => {
  const [consent, onboarding] = await Promise.all([
    read('src/components/ConsentModal.tsx'),
    read('src/components/OnboardingModal.tsx'),
  ]);

  for (const source of [consent, onboarding]) {
    assert.match(source, /import \{ Dialog \}/);
    assert.match(source, /<Dialog/);
  }

  assert.match(consent, /labelledBy="consent-dialog-title"/);
  assert.match(consent, /aria-pressed=/);
  assert.match(consent, /min-h-11/);
  assert.match(consent, /isSubmitting/);
  assert.match(consent, /role="alert"/);
  assert.match(onboarding, /labelledBy="onboarding-dialog-title"/);
  assert.match(onboarding, /describedBy="onboarding-step-description"/);
  assert.match(onboarding, /className="flex h-11 w-11/);
});

test('destructive local-data confirmation is an alert dialog', async () => {
  const history = await read('src/components/history/HistoryDashboard.tsx');

  assert.match(history, /role="alertdialog"/);
  assert.match(history, /labelledBy="clear-history-dialog-title"/);
  assert.match(history, /describedBy="clear-history-dialog-description"/);
  assert.match(history, /closeOnBackdrop=\{!isClearing\}/);
});
