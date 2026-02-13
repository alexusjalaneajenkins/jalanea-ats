import path from 'node:path';
import { test, expect } from '@playwright/test';

const resumeFixturePath = path.resolve(__dirname, 'fixtures/smoke-resume.txt');

test('upload + analysis flow does not hit React hook crash', async ({ page }) => {
  const runtimeErrors: string[] = [];

  page.on('pageerror', (error) => runtimeErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') {
      runtimeErrors.push(message.text());
    }
  });

  await page.goto('/');

  await page.locator('input[type="file"]').first().setInputFiles(resumeFixturePath);

  await page.waitForURL(/\/results\/[^/]+$/, { timeout: 30000 });
  await expect(page.getByRole('heading', { name: 'Job Description' })).toBeVisible({ timeout: 20000 });

  const manualPasteButton = page.getByRole('button', { name: /or type\/paste manually/i });
  if (await manualPasteButton.isVisible()) {
    await manualPasteButton.click();
  }

  const jobDescriptionInput = page.locator('#job-description-textarea');
  await expect(jobDescriptionInput).toBeVisible({ timeout: 20000 });
  await jobDescriptionInput.fill(
    'We are hiring a Senior Software Engineer with strong React, TypeScript, Node.js, SQL, cloud, and communication skills. Responsibilities include building web applications, optimizing performance, and collaborating with product and design teams.'
  );

  const analyzeButton = page.getByRole('button', { name: 'Analyze Job Match' });
  await expect(analyzeButton).toBeEnabled({ timeout: 10000 });
  await analyzeButton.click();

  await page.waitForTimeout(2500);
  await expect(page.locator('body')).not.toContainText('Application error:');

  const crashErrors = runtimeErrors.filter((error) =>
    /react error #310|rendered more hooks than during the previous render|application error/i.test(error)
  );

  expect(crashErrors).toEqual([]);
});
