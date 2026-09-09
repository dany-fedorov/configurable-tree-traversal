const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const examplesDirectory = path.join(root, 'examples');
const examples = fs
  .readdirSync(examplesDirectory, { withFileTypes: true })
  .filter((entry) => entry.isFile() && entry.name.endsWith('.ts'))
  .map((entry) => entry.name)
  .sort();

if (examples.length === 0) {
  throw new Error('No TypeScript examples found');
}

for (const example of examples) {
  const result = spawnSync(
    process.execPath,
    [
      '-r',
      'ts-node/register',
      '-r',
      'tsconfig-paths/register',
      path.join('examples', example),
    ],
    {
      cwd: root,
      encoding: 'utf8',
      timeout: 30_000,
      maxBuffer: 10 * 1024 * 1024,
    },
  );

  if (result.error || result.status !== 0) {
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
    throw new Error(
      `Example ${example} failed${
        result.error
          ? `: ${result.error.message}`
          : ` with exit code ${result.status}`
      }`,
    );
  }
}

console.log(`Verified ${examples.length} TypeScript examples.`);
