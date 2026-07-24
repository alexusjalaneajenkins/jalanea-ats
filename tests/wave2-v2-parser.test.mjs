import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { runBooleanSearch } from '../src/lib/v2/booleanSearch.ts';
import {
  classifyDegreeLevel,
  runKnockoutScreening,
} from '../src/lib/v2/knockoutScreen.ts';
import {
  matchesSkillTerm,
  runSectionMatching,
} from '../src/lib/v2/sectionMatch.ts';
import {
  extractGeminiText,
  parseAIRankingPayload,
  parseResumePayload,
} from '../src/lib/v2/validation.ts';
import { handleV2AnalysisRequest } from '../src/lib/v2/request.ts';
import { reconstructPdfPageText } from '../src/lib/parsers/pdfText.ts';

function resume(overrides = {}) {
  return {
    contactInfo: { name: 'Candidate' },
    workHistory: [],
    education: [],
    skills: [],
    certifications: [],
    ...overrides,
  };
}

function job(overrides = {}) {
  return {
    roleTitle: 'Test Role',
    knockoutCriteria: [],
    requiredSkills: [],
    requiredCertifications: [],
    preferredQualifications: [],
    keyResponsibilities: [],
    booleanSearchTerms: [],
    ...overrides,
  };
}

test('Boolean AND simulation requires every exact term and does not invent evidence', () => {
  const noEvidence = runBooleanSearch(resume(), []);
  assert.equal(noEvidence.score, 0);
  assert.equal(noEvidence.evidenceStatus, 'not-evaluated');
  assert.equal(noEvidence.wouldSurface, null);

  const partial = runBooleanSearch(
    resume({ skills: ['SQL'] }),
    ['SQL', 'Python']
  );
  assert.equal(partial.score, 50);
  assert.equal(partial.wouldSurface, false);

  const nonPhrase = runBooleanSearch(
    resume({ summary: 'Built machine systems for continuous learning.' }),
    ['machine learning']
  );
  assert.equal(nonPhrase.termResults[0].found, false);

  const phrase = runBooleanSearch(
    resume({ summary: 'Built machine learning systems.' }),
    ['machine learning']
  );
  assert.equal(phrase.wouldSurface, true);
});

test('required education and short certifications are deterministic hard checks', () => {
  const requirements = job({
    requiredEducation: { minimumDegree: 'Bachelor' },
    requiredCertifications: ['RN'],
  });

  const missing = runKnockoutScreening(
    resume({ certifications: ['BLS'] }),
    requirements
  );
  assert.equal(missing.overallStatus, 'fail');
  assert.equal(missing.hardFailCount, 2);

  const matched = runKnockoutScreening(
    resume({
      education: [
        { degree: 'Bachelor of Science', school: 'State University' },
      ],
      certifications: ['Registered Nurse (RN)'],
    }),
    requirements
  );
  assert.equal(matched.overallStatus, 'pass');
  assert.equal(matched.passed, true);

  const masters = runKnockoutScreening(
    resume({
      education: [
        { degree: 'Master of Arts', school: 'State University' },
      ],
    }),
    job({
      requiredEducation: { minimumDegree: "Master's degree" },
    })
  );
  assert.equal(masters.overallStatus, 'pass');
});

test('dotted degree abbreviations are canonicalized without treating unknown notation as absent', () => {
  for (const [notation, level] of [
    ['B.S.', 3],
    ['B.A.', 3],
    ['M.S.', 4],
    ['M.B.A.', 4],
    ['Ph.D.', 5],
  ]) {
    assert.deepEqual(classifyDegreeLevel(notation), {
      level,
      recognized: true,
    });
  }

  const requirement = job({
    requiredEducation: { minimumDegree: "Bachelor's degree" },
  });
  const unknown = runKnockoutScreening(
    resume({
      education: [{ degree: 'Level VII Diploma', school: 'Example School' }],
    }),
    requirement
  );
  const absent = runKnockoutScreening(resume(), requirement);

  assert.equal(unknown.overallStatus, 'needs-confirmation');
  assert.match(unknown.results[0].evidence, /could not be classified/i);
  assert.equal(absent.overallStatus, 'fail');
  assert.match(absent.results[0].evidence, /No education entries/i);
});

test('unverifiable hard requirements stay needs-confirmation rather than pass', () => {
  const result = runKnockoutScreening(
    resume(),
    job({
      knockoutCriteria: [
        {
          requirement: 'Authorized to work in the United States',
          category: 'authorization',
          isHardRequirement: true,
        },
      ],
    })
  );

  assert.equal(result.overallStatus, 'needs-confirmation');
  assert.equal(result.needsConfirmationCount, 1);
  assert.equal(result.passed, false);
});

test('section matching reports no evidence instead of a perfect score', () => {
  const result = runSectionMatching(resume(), job());
  assert.equal(result.score, null);
  assert.equal(result.evidenceStatus, 'not-evaluated');
});

test('section matching uses token boundaries and explicit technology aliases', () => {
  assert.equal(matchesSkillTerm('React developer', 'R'), false);
  assert.equal(matchesSkillTerm('NoSQL databases', 'SQL'), false);
  assert.equal(matchesSkillTerm('R SQL C++ .NET', 'R'), true);
  assert.equal(matchesSkillTerm('R SQL C++ .NET', 'SQL'), true);
  assert.equal(matchesSkillTerm('R SQL C++ .NET', 'C++'), true);
  assert.equal(matchesSkillTerm('R SQL C++ .NET', '.NET'), true);
  assert.equal(matchesSkillTerm('React.js applications', 'React'), true);

  const falsePositives = runSectionMatching(
    resume({ skills: ['React', 'NoSQL'] }),
    job({
      requiredSkills: [
        { skill: 'R', category: 'technical', matchSection: 'skills' },
        { skill: 'SQL', category: 'technical', matchSection: 'skills' },
      ],
    })
  );
  assert.equal(falsePositives.foundCount, 0);
});

test('provider payload validation clamps scores and rejects malformed shapes', () => {
  const ranking = parseAIRankingPayload(
    JSON.stringify({
      fitScore: 300,
      fitLabel: 'Weak Match',
      summary: 'Strong evidence.',
      strengths: ['SQL'],
      gaps: [],
      conceptualMatches: [],
      recommendations: [],
    })
  );
  assert.equal(ranking.fitScore, 100);
  assert.equal(ranking.fitLabel, 'Strong Match');

  assert.throws(
    () =>
      parseAIRankingPayload(
        JSON.stringify({
          fitScore: '100',
          summary: 'Invalid score type',
          strengths: [],
          gaps: [],
          conceptualMatches: [],
          recommendations: [],
        })
      ),
    /Invalid AI ranking response shape/
  );
  assert.throws(
    () => parseResumePayload(JSON.stringify({ contactInfo: {} })),
    /Invalid resume analysis response shape/
  );

  assert.equal(
    extractGeminiText({
      candidates: [{ content: { parts: [{ text: '{"ok":' }, { text: 'true}' }] } }],
    }),
    '{"ok":true}'
  );
});

test('V2 validates input before authorization or quota consumption', async () => {
  const calls = [];
  const dependencies = {
    isProviderConfigured: () => true,
    authorize: async () => {
      calls.push('authorize');
      return { id: 'user-1' };
    },
    consumeQuota: async () => {
      calls.push('quota');
      return true;
    },
    analyze: async () => {
      calls.push('analyze');
      throw new Error('raw provider secret detail');
    },
  };

  const invalid = await handleV2AnalysisRequest(
    new Request('https://ats.example/api/analyze-v2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-AI-Consent': 'acknowledged',
      },
      body: JSON.stringify({ resume: 'short', jobDescription: 'short' }),
    }),
    dependencies
  );
  assert.equal(invalid.status, 400);
  assert.deepEqual(calls, []);

  const validText = 'a'.repeat(80);
  const failedProvider = await handleV2AnalysisRequest(
    new Request('https://ats.example/api/analyze-v2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-AI-Consent': 'acknowledged',
      },
      body: JSON.stringify({
        resume: validText,
        jobDescription: validText,
      }),
    }),
    dependencies
  );
  assert.equal(failedProvider.status, 502);
  assert.deepEqual(calls, ['authorize', 'quota', 'analyze']);
  assert.doesNotMatch(await failedProvider.text(), /raw provider secret detail/);
});

test('PDF text reconstruction has defined one-column and two-column order', () => {
  const oneColumn = reconstructPdfPageText(
    [
      { str: 'Jane', x: 40, y: 700, width: 30, height: 12 },
      { str: 'Doe', x: 78, y: 700, width: 25, height: 12 },
      { str: 'Experience', x: 40, y: 650, width: 70, height: 12 },
    ],
    600
  );
  assert.equal(oneColumn, 'Jane Doe\nExperience');

  const twoColumn = reconstructPdfPageText(
    [
      { str: 'JANE DOE', x: 40, y: 800, width: 500, height: 16 },
      { str: 'LEFT ONE', x: 40, y: 700, width: 100, height: 12 },
      { str: 'RIGHT ONE', x: 340, y: 700, width: 100, height: 12 },
      { str: 'LEFT TWO', x: 40, y: 650, width: 100, height: 12 },
      { str: 'RIGHT TWO', x: 340, y: 650, width: 100, height: 12 },
    ],
    600
  );
  assert.equal(
    twoColumn,
    'JANE DOE\nLEFT ONE\nLEFT TWO\nRIGHT ONE\nRIGHT TWO'
  );
});

test('PDF parser uses the package-matched local worker', async () => {
  const root = new URL('../', import.meta.url);
  const parserSource = await readFile(
    fileURLToPath(new URL('src/lib/parsers/pdf.ts', root)),
    'utf8'
  );
  const publicWorker = await readFile(
    fileURLToPath(new URL('public/pdf.worker.min.mjs', root))
  );
  const packageWorker = await readFile(
    fileURLToPath(
      new URL('node_modules/pdfjs-dist/build/pdf.worker.min.mjs', root)
    )
  );

  assert.match(parserSource, /workerSrc = '\/pdf\.worker\.min\.mjs'/);
  assert.doesNotMatch(parserSource, /cdn\\.jsdelivr\\.net/);
  assert.deepEqual(publicWorker, packageWorker);
});
