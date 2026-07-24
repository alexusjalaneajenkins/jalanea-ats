import { execFileSync } from 'node:child_process';

const releaseFiles = execFileSync(
  'git',
  ['ls-files', '--cached', '--others', '--exclude-standard', '-z'],
  {
    encoding: 'utf8',
  }
)
  .split('\0')
  .filter(Boolean);

const forbidden = releaseFiles.filter((file) =>
  /(^|\/)[^/]* 2\.(?:[cm]?[jt]sx?|json|sql|mjs|cjs)$/i.test(file)
  || file === 'firebase-debug.log'
  || file === 'next.config.ts.bak'
  || file === '.DS_Store'
  || file.startsWith('supabase/.temp/')
);

if (forbidden.length > 0) {
  process.stderr.write(
    `Release hygiene failed. Remove these generated/conflict files from the release tree:\n${forbidden
      .map((file) => `- ${file}`)
      .join('\n')}\n`
  );
  process.exit(1);
}

process.stdout.write('Release hygiene passed.\n');
