// Tarball end-to-end gate: packs the package, installs the real tarball into a
// fresh consumer project, and proves the three consumer paths work — plugin
// import through package.json resolution, the recommended preset flagging a
// violation, and the dlinter CLI scaffolding the gate. This is the regression
// net for entry-point drift (e.g. build output extensions changing).
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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
// npm <= 11 returns an array of pack entries; npm >= 12 keys them by package
// name. Accept both so the gate survives the npm update in the publish job.
const packEntry = Array.isArray(packOutput) ? packOutput[0] : Object.values(packOutput)[0];

if (!packEntry?.filename) {
  fail(`could not read the tarball filename from npm pack --json output: ${JSON.stringify(packOutput).slice(0, 200)}`);
}

const tarballPath = path.join(packageRoot, packEntry.filename);
const consumerRoot = bootstrapConsumer('dlinter-pack-e2e-', tarballPath, 'eslint typescript@6.0.3');

try {
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
  assertDefaultInitScaffold(consumerRoot);
  assertWailsFrontendInitScaffold(tarballPath);

  console.log('pack e2e: OK — plugin import, recommended preset, and CLI (default + wails-frontend profile) verified from the real tarball.');
} finally {
  rmSync(consumerRoot, { recursive: true, force: true });
  rmSync(tarballPath, { force: true });
}

/**
 * Creates a fresh temp consumer project and installs the packed tarball
 * (plus any extra packages) into it via a real `npm install` — the shared
 * bootstrap both init smoke scenarios below build on.
 * @param prefix - `mkdtemp` prefix identifying which smoke scenario this is.
 * @param tarballPath - the packed tarball to install.
 * @param extraPackages - additional space-separated packages to install alongside it.
 * @returns the new consumer project's root directory.
 */
function bootstrapConsumer(prefix, tarballPath, extraPackages = '') {
  const root = mkdtempSync(path.join(tmpdir(), prefix));

  run('npm init -y', root);
  run(`npm install -D "${tarballPath}"${extraPackages ? ` ${extraPackages}` : ''}`, root);

  return root;
}

/** Fails the gate unless `relativePath` exists under `root`. */
function assertPathExists(root, relativePath) {
  if (!existsSync(path.join(root, relativePath))) {
    fail(`dlinter init did not scaffold ${relativePath}`);
  }
}

/**
 * Thin per-behavior smoke for the default (`ts-lib`) detection path: the
 * gate file, the fallow config, and the scaffolded scripts all exist.
 * @param consumerRoot - the temp consumer `dlinter init` already ran in.
 */
function assertDefaultInitScaffold(consumerRoot) {
  assertPathExists(consumerRoot, 'lefthook.yml');
  assertPathExists(consumerRoot, '.fallowrc.json');

  const manifest = JSON.parse(readFileSync(path.join(consumerRoot, 'package.json'), 'utf8'));
  const missingScripts = ['audit', 'lint', 'typecheck'].filter((script) => !manifest.scripts?.[script]);

  if (missingScripts.length > 0) {
    fail(`dlinter init did not scaffold these package.json scripts: ${missingScripts.join(', ')}`);
  }
}

/**
 * Thin per-behavior smoke for the `wails-frontend` detection path (MSI-DET-4):
 * a fresh consumer with `wails.json` + `frontend/package.json` scaffolds
 * `lefthook.yml` with a `frontend`-rooted job and `frontend/.fallowrc.json`.
 * @param tarballPath - the packed tarball to install into a fresh consumer.
 */
function assertWailsFrontendInitScaffold(tarballPath) {
  const wailsRoot = bootstrapConsumer('dlinter-pack-e2e-wails-', tarballPath);

  try {
    writeFileSync(path.join(wailsRoot, 'wails.json'), '{}\n');
    mkdirSync(path.join(wailsRoot, 'frontend'), { recursive: true });
    writeFileSync(path.join(wailsRoot, 'frontend', 'package.json'), JSON.stringify({ name: 'frontend' }, null, 2));

    run('npx dlinter init', wailsRoot);
    assertPathExists(wailsRoot, path.join('frontend', '.fallowrc.json'));

    const lefthook = readFileSync(path.join(wailsRoot, 'lefthook.yml'), 'utf8');

    if (!lefthook.includes('root: frontend')) {
      fail('dlinter init did not root the wails-frontend gate jobs at frontend/');
    }
  } finally {
    rmSync(wailsRoot, { recursive: true, force: true });
  }
}
