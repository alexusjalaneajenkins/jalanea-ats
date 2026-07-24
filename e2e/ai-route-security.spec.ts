import { expect, test } from '@playwright/test';

const validBody = {
  bullet: 'Improved customer retention by redesigning the onboarding flow.',
  jobDescription: 'Lead product improvements for a growing customer platform.',
};

test.describe('AI route containment', () => {
  test('bullet improvement requires explicit AI consent', async ({ request }) => {
    const response = await request.post('/api/improve-bullet', {
      data: validBody,
    });

    expect(response.status()).toBe(428);
  });

  test('invalid bullet input is rejected before service configuration', async ({
    request,
  }) => {
    const response = await request.post('/api/improve-bullet', {
      headers: { 'X-AI-Consent': 'acknowledged' },
      data: { ...validBody, bullet: 'short' },
    });

    expect(response.status()).toBe(400);
  });

  test('unused legacy analysis endpoint is absent', async ({ request }) => {
    const response = await request.post('/api/analyze', {
      headers: { 'X-AI-Consent': 'acknowledged' },
      data: {
        resume: 'A'.repeat(100),
        jobDescription: 'B'.repeat(100),
      },
    });

    expect(response.status()).toBe(404);
  });
});
