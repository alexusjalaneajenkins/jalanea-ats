import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';

const releaseFiles = execFileSync(
  'git',
  ['ls-files', '--cached', '--others', '--exclude-standard', '-z'],
  {
    encoding: 'utf8',
  }
)
  .split('\0')
  .filter(Boolean);

const patterns = [
  ['Stripe secret key', /\bsk_(?:live|test)_[A-Za-z0-9]{16,}\b/],
  ['Stripe webhook secret', /\bwhsec_[A-Za-z0-9]{16,}\b/],
  ['Supabase secret key', /\bsb_secret_[A-Za-z0-9_-]{16,}\b/],
  ['Resend API key', /\bre_[A-Za-z0-9]{20,}\b/],
  ['Google API key', /\bAIza[0-9A-Za-z_-]{30,}\b/],
  ['OpenAI project key', /\bsk-proj-[A-Za-z0-9_-]{20,}\b/],
];

const findings = [];

for (const file of releaseFiles) {
  let contents;
  try {
    const buffer = await readFile(file);
    if (buffer.includes(0)) continue;
    contents = buffer.toString('utf8');
  } catch {
    continue;
  }

  for (const [label, pattern] of patterns) {
    if (pattern.test(contents)) {
      findings.push(`${file}: ${label}`);
    }
  }
}

if (findings.length > 0) {
  process.stderr.write(
    `Potential committed secrets found (values intentionally hidden):\n${findings
      .map((finding) => `- ${finding}`)
      .join('\n')}\n`
  );
  process.exit(1);
}

process.stdout.write('Release-tree secret scan passed.\n');
