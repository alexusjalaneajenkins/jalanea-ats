import path from 'node:path';
import { test, expect } from '@playwright/test';

const resumeFixturePath = path.resolve(__dirname, 'fixtures/smoke-resume.txt');

test('upload + analysis flow does not hit React hook crash', async ({ page }) => {
  const runtimeErrors: string[] = [];
  const resetAt = new Date(Date.now() + 86_400_000).toISOString();

  page.on('pageerror', (error) => runtimeErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') {
      runtimeErrors.push(message.text());
    }
  });
  await page.route('**/api/analyze-free', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          enabled: true,
          dailyLimit: 3,
          used: 0,
          remaining: 3,
          resetAt,
        }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: {
        'X-FreeTier-Remaining': '2',
      },
      body: JSON.stringify({
        score: 78,
        summary: 'The resume is a solid match for the supplied role.',
        strengths: ['React and TypeScript experience'],
        gaps: ['Add more SQL impact evidence'],
        recommendations: ['Quantify performance improvements'],
        keywordMatches: {
          found: ['React', 'TypeScript', 'Node.js'],
          missing: ['SQL'],
          matchRate: 75,
        },
        sections: [
          {
            name: 'Experience',
            score: 80,
            feedback: 'Relevant experience is present.',
          },
        ],
        formatting: {
          issues: [],
          suggestions: ['Keep headings consistent'],
        },
        overallSuggestions: ['Add measurable outcomes'],
        _freeTier: {
          remaining: 2,
          resetAt,
        },
      }),
    });
  });

  await page.goto('/');

  await page.locator('input[type="file"]').first().setInputFiles(resumeFixturePath);

  await page.waitForURL(/\/results\/[^/]+$/, { timeout: 30000 });
  await expect(page.getByRole('heading', { name: 'Job Description' })).toBeVisible({ timeout: 20000 });

  const jobDescriptionSection = page.getByRole('button', { name: /add job description/i });
  if (await jobDescriptionSection.isVisible()) {
    await jobDescriptionSection.click();
  }

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
  const analysisResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes('/api/analyze-free') &&
      response.request().method() === 'POST',
    { timeout: 45000 }
  );

  await analyzeButton.click();

  const consentHeading = page.getByRole('heading', { name: 'Enable AI Features' });
  const consentOpened = await consentHeading
    .waitFor({ state: 'visible', timeout: 3000 })
    .then(() => true)
    .catch(() => false);
  if (consentOpened) {
    const acknowledgments = [
      'I understand my data will be sent to external servers',
      'I understand AI usage limits apply',
      'I will review all AI suggestions before using them',
      'I understand how AI requests and API keys are handled',
    ];

    for (const [index, acknowledgment] of acknowledgments.entries()) {
      await page.getByRole('button', { name: acknowledgment }).click();
      await page
        .getByRole('button', { name: index === acknowledgments.length - 1 ? 'Enable AI Features' : 'Next' })
        .last()
        .click();
    }
  }

  const analysisResponse = await analysisResponsePromise;
  expect(analysisResponse.status(), `unexpected /api/analyze-free status: ${analysisResponse.status()}`).toBeLessThan(500);

  await expect(page.getByText('AI analysis', { exact: true })).toBeVisible({
    timeout: 20000,
  });
  await expect(
    page.getByRole('heading', { name: /demo assessment/i })
  ).toBeVisible({ timeout: 20000 });
  await expect(page.getByText('Demo', { exact: true })).toBeVisible({ timeout: 45000 });
  await expect(
    page.getByText(/2 of 3 free analyses remaining/i)
  ).toBeVisible({ timeout: 20000 });

  await expect(page.locator('body')).not.toContainText('Application error:');

  const crashErrors = runtimeErrors.filter((error) =>
    /react error #310|rendered more hooks than during the previous render|application error/i.test(error)
  );

  expect(crashErrors).toEqual([]);
});
