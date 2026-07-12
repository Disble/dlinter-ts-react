import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { detect } from '../init/detect/index.js';

let projectRoot = '';

beforeEach(() => {
  projectRoot = mkdtempSync(path.join(tmpdir(), 'dlinter-detect-'));
});

afterEach(() => {
  rmSync(projectRoot, { recursive: true, force: true });
});

describe('detect', () => {
  it.each([
    {
      name: 'wails-frontend without a frontend/ subdir resolves surface to project root (MSI-DET-4)',
      setup: (root: string) => writeFileSync(path.join(root, 'wails.json'), '{}'),
      profile: 'wails-frontend',
      surfaceDir: '',
    },
    {
      name: 'wails-frontend with a real frontend/package.json resolves surface to frontend/ (MSI-DET-4)',
      setup: (root: string) => {
        writeFileSync(path.join(root, 'wails.json'), '{}');
        mkdirSync(path.join(root, 'frontend'));
        writeFileSync(path.join(root, 'frontend', 'package.json'), '{}');
      },
      profile: 'wails-frontend',
      surfaceDir: 'frontend',
    },
    {
      name: 'nextjs resolves from next.config.js at the project root',
      setup: (root: string) => writeFileSync(path.join(root, 'next.config.js'), 'module.exports = {};'),
      profile: 'nextjs',
      surfaceDir: '',
    },
    {
      name: 'react-native resolves from app.json plus the expo dependency',
      setup: (root: string) => {
        writeFileSync(path.join(root, 'app.json'), '{}');
        writeFileSync(path.join(root, 'package.json'), JSON.stringify({ dependencies: { expo: '^50.0.0' } }));
      },
      profile: 'react-native',
      surfaceDir: '',
    },
    {
      name: 'react-spa resolves from react + react-dom dependencies, no marker file',
      setup: (root: string) =>
        writeFileSync(
          path.join(root, 'package.json'),
          JSON.stringify({ dependencies: { react: '^18.0.0', 'react-dom': '^18.0.0' } }),
        ),
      profile: 'react-spa',
      surfaceDir: '',
    },
    {
      name: 'ts-lib is the terminal fallback for a bare package.json + tsconfig.json (MSI-DET-2 step 5)',
      setup: (root: string) => {
        writeFileSync(path.join(root, 'package.json'), '{}');
        writeFileSync(path.join(root, 'tsconfig.json'), '{}');
      },
      profile: 'ts-lib',
      surfaceDir: '',
    },
  ])('$name', ({ setup, profile, surfaceDir }) => {
    setup(projectRoot);

    const plan = detect(projectRoot);

    expect(plan.surfaces).toHaveLength(1);
    expect(plan.surfaces[0]?.profile.name).toBe(profile);
    expect(plan.surfaces[0]?.dir).toBe(surfaceDir);
  });

  it('defaults the runner to npm when no lockfile is present (MSI-DET-1)', () => {
    writeFileSync(path.join(projectRoot, 'package.json'), '{}');

    expect(detect(projectRoot).runner.name).toBe('npm');
  });

  it('forces the --profile override while runner detection still runs normally (MSI-DET-3)', () => {
    writeFileSync(path.join(projectRoot, 'pnpm-lock.yaml'), '');
    writeFileSync(path.join(projectRoot, 'package.json'), '{}');

    const plan = detect(projectRoot, 'react-spa');

    expect(plan.surfaces[0]?.profile.name).toBe('react-spa');
    expect(plan.runner.name).toBe('pnpm');
  });

  it('rejects an unknown --profile override before returning a plan (MSI-DET-3)', () => {
    expect(() => detect(projectRoot, 'bogus-profile')).toThrow(/Unknown --profile "bogus-profile"/);
  });

  it('returns a complete ProjectPlan with exactly one surface for a near-empty directory (MSI-DET-6)', () => {
    writeFileSync(path.join(projectRoot, 'package.json'), '{}');

    const plan = detect(projectRoot);

    expect(plan.cwd).toBe(projectRoot);
    expect(plan.runner).toBeDefined();
    expect(plan.surfaces).toHaveLength(1);
  });
});
