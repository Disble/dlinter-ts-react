// Tarball end-to-end gate: packs the package, installs the real tarball into a
// fresh consumer project, and proves the three consumer paths work — plugin
// import through package.json resolution, the recommended preset flagging a
// violation, and the dlinter CLI scaffolding the gate. This is the regression
// net for entry-point drift (e.g. build output extensions changing).
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const packageRoot = process.cwd();

function run(command, cwd) {
  return execSync(command, { cwd, stdio: 'pipe', encoding: 'utf8' });
}

function fail(message) {
  console.error(`pack e2e FAILED: ${message}`);
  process.exit(1);
}

const packOutput = JSON.parse(run('npm pack --json', packageRoot));
const tarballPath = path.join(packageRoot, packOutput[0].filename);
const consumerRoot = mkdtempSync(path.join(tmpdir(), 'dlinter-pack-e2e-'));

try {
  run('npm init -y', consumerRoot);
  run(`npm install -D "${tarballPath}" eslint typescript@6.0.3`, consumerRoot);

  writeFileSync(
    path.join(consumerRoot, 'eslint.config.mjs'),
    "import dlinter from 'dlinter-ts-react';\n\nexport default [...dlinter.configs.recommended];\n",
  );
  writeFileSync(
    path.join(consumerRoot, 'tsconfig.json'),
    '{ "compilerOptions": { "jsx": "react-jsx" }, "include": ["src"] }\n',
  );
  mkdirSync(path.join(consumerRoot, 'src', 'features', 'clock'), { recursive: true });
  writeFileSync(
    path.join(consumerRoot, 'src', 'features', 'clock', 'Clock.tsx'),
    [
      "import { useEffect } from 'react';",
      '',
      '/**',
      ' * Renders a clock.',
      ' */',
      'export function Clock() {',
      '  useEffect(() => {}, []);',
      '  return null;',
      '}',
      '',
    ].join('\n'),
  );

  let lintReport = '';
  try {
    lintReport = run('npx eslint src --format json', consumerRoot);
  } catch (error) {
    // eslint exits 1 when it finds errors — that is the expected path here.
    lintReport = error.stdout ?? '';
  }

  const lintResults = JSON.parse(lintReport);
  const ruleIds = lintResults.flatMap((result) => result.messages.map((message) => message.ruleId));

  if (!ruleIds.includes('dlinter/no-view-effects')) {
    fail(`recommended preset did not flag dlinter/no-view-effects; got: ${ruleIds.join(', ') || '(none)'}`);
  }

  run('npx dlinter init', consumerRoot);

  if (!existsSync(path.join(consumerRoot, 'lefthook.yml'))) {
    fail('dlinter init did not scaffold lefthook.yml');
  }

  console.log('pack e2e: OK — plugin import, recommended preset, and CLI verified from the real tarball.');
} finally {
  rmSync(consumerRoot, { recursive: true, force: true });
  rmSync(tarballPath, { force: true });
}
