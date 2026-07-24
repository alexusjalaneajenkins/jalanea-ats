import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('jalanea-onboarding-seen', 'true');
    localStorage.setItem('pwa-install-dismissed', 'true');
  });
});

test('HTML uses a request nonce and baseline security headers', async ({
  page,
}) => {
  const response = await page.goto('/');
  expect(response).not.toBeNull();

  const headers = response!.headers();
  expect(headers['content-security-policy']).toContain("script-src 'self' 'nonce-");
  expect(headers['content-security-policy']).toContain("'strict-dynamic'");
  expect(headers['content-security-policy']).toContain("object-src 'none'");
  expect(headers['x-content-type-options']).toBe('nosniff');
  expect(headers['x-frame-options']).toBe('DENY');
  expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');

  const nonceMatch = headers['content-security-policy'].match(
    /script-src 'self' 'nonce-([^']+)'/
  );
  expect(nonceMatch).not.toBeNull();

  const html = await response!.text();
  const renderedScripts = Array.from(html.matchAll(/<script\b[^>]*>/g)).map(
    ([tag]) => tag
  );
  expect(renderedScripts.length).toBeGreaterThan(0);
  expect(
    renderedScripts.every((tag) =>
      tag.includes(`nonce="${nonceMatch![1]}"`)
    )
  ).toBe(true);
});

test('job launcher creates correctly scoped external searches', async ({
  page,
}) => {
  await page.goto('/jobs');
  await page.getByLabel('Role or job title').fill('Registered Nurse');
  await page.getByLabel('Location').fill('Atlanta, GA');
  await page.getByRole('button', { name: 'Create job searches' }).click();

  const indeed = page.getByRole('link', { name: /Search Indeed/ });
  const linkedIn = page.getByRole('link', { name: /Search LinkedIn/ });
  await expect(indeed).toHaveAttribute('target', '_blank');
  await expect(linkedIn).toHaveAttribute('target', '_blank');

  const indeedUrl = new URL((await indeed.getAttribute('href'))!);
  expect(indeedUrl.origin).toBe('https://www.indeed.com');
  expect(indeedUrl.searchParams.get('q')).toBe('Registered Nurse');
  expect(indeedUrl.searchParams.get('l')).toBe('Atlanta, GA');

  const linkedInUrl = new URL((await linkedIn.getAttribute('href'))!);
  expect(linkedInUrl.origin).toBe('https://www.linkedin.com');
  expect(linkedInUrl.searchParams.get('keywords')).toBe('Registered Nurse');
  expect(linkedInUrl.searchParams.get('location')).toBe('Atlanta, GA');
});

test('AI settings traps focus, closes on Escape, and restores focus', async ({
  page,
}) => {
  await page.goto('/');
  const trigger = page.getByRole('button', { name: /AI settings/i });
  await trigger.click();

  const dialog = page.getByRole('dialog', { name: 'AI Assistant Settings' });
  await expect(dialog).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() => {
        const active = document.activeElement;
        const modal = document.querySelector('dialog[open]');
        return !!active && !!modal && modal.contains(active);
      })
    )
    .toBe(true);

  for (let index = 0; index < 16; index += 1) {
    await page.keyboard.press('Tab');
    expect(
      await page.evaluate(() => {
        const active = document.activeElement;
        const modal = document.querySelector('dialog[open]');
        return !!active && !!modal && modal.contains(active);
      })
    ).toBe(true);
  }

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});

test('blocked persistent storage produces an honest reduced-persistence notice', async ({
  browser,
}) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.addInitScript(() => {
    localStorage.setItem('jalanea-onboarding-seen', 'true');
    Object.defineProperty(window, 'indexedDB', {
      configurable: true,
      get() {
        throw new DOMException('denied', 'SecurityError');
      },
    });
  });

  await page.goto('/');
  await expect(
    page.getByRole('status').filter({ hasText: 'Temporary browser storage' })
  ).toBeVisible();
  await expect(page.getByText(/lost when the tab closes/i)).toBeVisible();
  await context.close();
});

test('install assets are real and the offline page makes no offline-analysis claim', async ({
  request,
}) => {
  const manifestResponse = await request.get('/manifest.json');
  expect(manifestResponse.ok()).toBe(true);
  const manifest = await manifestResponse.json();
  expect(manifest.icons).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ sizes: '192x192', type: 'image/png' }),
      expect.objectContaining({
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      }),
    ])
  );

  for (const path of [
    '/icons/icon-192.png',
    '/icons/icon-512.png',
    '/icons/icon-maskable-512.png',
    '/sw.js',
    '/offline.html',
  ]) {
    expect((await request.get(path)).ok(), `${path} should exist`).toBe(true);
  }

  const offline = await (await request.get('/offline.html')).text();
  expect(offline).toContain('require a network connection');
  expect(offline).not.toMatch(/analy[sz]e.*offline/i);
});
