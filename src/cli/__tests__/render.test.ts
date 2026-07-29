import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import type { ProjectPlan } from '../init/detect/detect.types.js';
import { render } from '../init/render/index.js';
import { STACK_PROFILES } from '../init/profiles/profiles.constants.js';
import type { ProfileName } from '../init/profiles/profiles.types.js';
import { RUNNER_ADAPTERS } from '../init/runners/runners.constants.js';
import type { RunnerName } from '../init/runners/runners.types.js';

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>();

  return {
    ...actual,
    existsSync: vi.fn(actual.existsSync),
    readFileSync: vi.fn(actual.readFileSync),
    readdirSync: vi.fn(actual.readdirSync),
    writeFileSync: vi.fn(actual.writeFileSync),
  };
});

/** Looks up a registered stack profile by name, or fails fast with a fixture-setup error if it isn't registered. */
function findProfile(name: ProfileName) {
  const profile = STACK_PROFILES.find((candidate) => candidate.name === name);

  if (!profile) {
    throw new Error(`Test fixture setup failure: no registered profile named "${name}".`);
  }

  return profile;
}

/** Builds a minimal single-surface `ProjectPlan` fixture using the `bun` runner adapter and the named profile. */
function buildPlan(name: ProfileName, surfaceDir: string, runnerName: RunnerName = 'bun'): ProjectPlan {
  const profile = findProfile(name);
  const runner = RUNNER_ADAPTERS.find((candidate) => candidate.name === runnerName);

  if (!runner) {
    throw new Error(`Test fixture setup failure: no registered "${runnerName}" runner adapter.`);
  }

  return { cwd: '/virtual-project', runner, surfaces: [{ dir: surfaceDir, profile }] };
}

describe('render', () => {
  it.each(STACK_PROFILES.map((profile) => profile.name))(
    'renders exactly 4 lefthook jobs (fallow, lint, typecheck, test) for %s, invoking runner.run — never a raw binary (MSI-REN-1)',
    (name) => {
      const plan = buildPlan(name, '');

      const { lefthookJobs } = render(plan);

      expect(lefthookJobs.map((job) => job.name)).toEqual(['fallow', 'lint', 'typecheck', 'test']);
      expect(lefthookJobs.map((job) => job.run)).toEqual([
        'bun run audit',
        'bun run lint',
        'bun run typecheck',
        'bun run test',
      ]);
    },
  );

  it("carries root: 'frontend' on every job when wails-frontend's surface resolves to frontend/ (ADR-3)", () => {
    const plan = buildPlan('wails-frontend', 'frontend');

    const { lefthookJobs } = render(plan);

    expect(lefthookJobs.every((job) => job.root === 'frontend')).toBe(true);
  });

  it('leaves root undefined for every root-surface profile', () => {
    for (const profile of STACK_PROFILES) {
      const { lefthookJobs } = render(buildPlan(profile.name, ''));

      expect(lefthookJobs.every((job) => job.root === undefined)).toBe(true);
    }
  });

  it('is pure: repeat calls on the same plan return deep-equal artifacts and touch no filesystem API (MSI-REN-6)', () => {
    vi.mocked(existsSync).mockClear();
    vi.mocked(readFileSync).mockClear();
    vi.mocked(readdirSync).mockClear();
    vi.mocked(writeFileSync).mockClear();

    const plan = buildPlan('ts-lib', '');

    const first = render(plan);
    const second = render(plan);

    expect(second).toEqual(first);
    expect(vi.mocked(existsSync)).not.toHaveBeenCalled();
    expect(vi.mocked(readFileSync)).not.toHaveBeenCalled();
    expect(vi.mocked(readdirSync)).not.toHaveBeenCalled();
    expect(vi.mocked(writeFileSync)).not.toHaveBeenCalled();
  });

  it('throws when the plan carries no surface — the detect() invariant guard (MSI-DET-6)', () => {
    const plan: ProjectPlan = { ...buildPlan('ts-lib', ''), surfaces: [] };

    expect(() => render(plan)).toThrow('Cannot render a ProjectPlan with no surfaces.');
  });

  it.each([
    ['bun', "const command = ['bun', 'x', 'stryker'];"],
    ['npm', "const command = ['npx', 'stryker'];"],
    ['pnpm', "const command = ['pnpm', 'exec', 'stryker'];"],
    ['yarn', "const command = ['yarn', 'exec', 'stryker'];"],
  ] as const)('renders the staged mutation guard for the %s runner', (runner, command) => {
    const base = buildPlan('react-spa', '');
    const withoutMutator = render({ ...base, runner: buildPlan('react-spa', '', runner).runner });
    const withMutator = render({ ...base, runner: buildPlan('react-spa', '', runner).runner, testMutator: true });

    expect(withoutMutator.files).toEqual([]);
    expect(withoutMutator.gitignoreEntries).toEqual([]);
    expect(withoutMutator.requiredScripts).toEqual({});
    expect(withoutMutator.requiredLefthookJobs).toEqual([]);
    expect(withMutator.files.map((file) => file.path)).toEqual([
      'scripts/dlinter-mutation-staged.mjs',
      'stryker.dlinter.json',
      'vitest.dlinter-mutation.mts',
    ]);
    expect(withMutator.gitignoreEntries).toEqual(['.dlinter-mutation-tmp/']);
    expect(withMutator.scripts['test:mutation:staged']).toBe('node ./scripts/dlinter-mutation-staged.mjs');
    expect(withMutator.lefthookJobs.map((job) => job.name)).toContain('test:mutation:staged');
    expect(withMutator.requiredScripts).toEqual({ 'test:mutation:staged': 'node ./scripts/dlinter-mutation-staged.mjs' });
    expect(withMutator.requiredLefthookJobs).toEqual([{ name: 'test:mutation:staged', run: `${runner} run test:mutation:staged` }]);
    expect(withMutator.lefthookJobs.find((job) => job.name === 'test:mutation:staged')).toEqual({
      name: 'test:mutation:staged',
      run: `${runner} run test:mutation:staged`,
    });
    expect(withMutator.files[0]?.content).toContain("replaceAll('\\\\', '/')");
    expect(withMutator.files[0]?.content).toContain(command);

    const stryker = JSON.parse(withMutator.files[1]?.content ?? '') as Record<string, unknown>;
    expect(stryker).toEqual({
      testRunner: 'vitest',
      plugins: ['@stryker-mutator/vitest-runner'],
      concurrency: 4,
      ignoreStatic: true,
      cleanTempDir: 'always',
      tempDirName: '.dlinter-mutation-tmp',
      reporters: ['clear-text'],
      thresholds: { high: 100, low: 100, break: 100 },
      vitest: { configFile: 'vitest.dlinter-mutation.mts' },
    });
    expect(withMutator.files[2]?.content).toContain("include: ['src/**/*.{test,spec}.{ts,tsx}']");
    expect(withMutator.files[2]?.content).toContain("exclude: ['scripts/**', '**/scripts/**', '**/.dlinter-mutation-tmp/**']");

    const temporaryDirectory = mkdtempSync(path.join(tmpdir(), 'dlinter-mutation-guard-'));
    const guardPath = path.join(temporaryDirectory, 'guard.mjs');

    try {
      writeFileSync(guardPath, withMutator.files[0]?.content ?? '');
      expect(() => execFileSync(process.execPath, ['--check', guardPath])).not.toThrow();
    } finally {
      rmSync(temporaryDirectory, { recursive: true, force: true });
    }
  });

  it('roots the staged mutation job at the resolved non-root surface', () => {
    const { lefthookJobs, files } = render({ ...buildPlan('wails-frontend', 'frontend'), testMutator: true });
    const mutationJob = lefthookJobs.find((job) => job.name === 'test:mutation:staged');

    expect(mutationJob).toEqual({ name: 'test:mutation:staged', run: 'bun run test:mutation:staged', root: 'frontend' });
    expect(render({ ...buildPlan('wails-frontend', 'frontend'), testMutator: true }).requiredLefthookJobs).toEqual([
      { name: 'test:mutation:staged', run: 'bun run test:mutation:staged', root: 'frontend' },
    ]);
    expect(files.map((file) => file.path)).toEqual([
      'frontend/scripts/dlinter-mutation-staged.mjs',
      'frontend/stryker.dlinter.json',
      'frontend/vitest.dlinter-mutation.mts',
    ]);
  });

  describe('.fallowrc.json (MSI-REN-3)', () => {
    it.each(
      STACK_PROFILES.map((profile) => ({
        name: profile.name,
        surfaceDir: profile.surfaceDir,
        entryPoints: profile.fallow?.entryPoints ?? [],
        ignorePatterns: profile.fallow?.ignorePatterns ?? [],
      })),
    )('renders $name\'s .fallowrc.json matching its FallowConfig table entry', ({ name, surfaceDir, entryPoints, ignorePatterns }) => {
      const { fallowFiles } = render(buildPlan(name, surfaceDir));

      expect(fallowFiles).toHaveLength(1);
      const file = fallowFiles[0];

      if (!file) {
        throw new Error('Expected exactly one rendered fallow file.');
      }

      expect(file.path).toBe(surfaceDir === '' ? '.fallowrc.json' : `${surfaceDir}/.fallowrc.json`);

      const body = JSON.parse(file.content) as { entry: string[]; ignorePatterns: string[] };

      expect(body.entry).toEqual([...entryPoints]);
      expect(body.ignorePatterns).toEqual([...ignorePatterns]);
    });

    it("includes a wailsjs/** ignore pattern in wails-frontend's rendered file (MSI-REN-4)", () => {
      const { fallowFiles } = render(buildPlan('wails-frontend', 'frontend'));
      const file = fallowFiles[0];

      if (!file) {
        throw new Error('Expected exactly one rendered fallow file.');
      }

      const body = JSON.parse(file.content) as { ignorePatterns: string[] };

      expect(body.ignorePatterns).toContain('wailsjs/**');
    });

    it('embeds the strict architecture baseline (rules + duplicates + barrel handling) in every rendered fallowrc', () => {
      for (const profile of STACK_PROFILES) {
        if (!profile.fallow) {
          continue;
        }

        const { fallowFiles } = render(buildPlan(profile.name, profile.surfaceDir));
        const file = fallowFiles[0];

        if (!file) {
          throw new Error(`Expected a rendered fallow file for ${profile.name}.`);
        }

        const body = JSON.parse(file.content) as {
          rules: Record<string, string>;
          duplicates: { mode: string; threshold: number; minOccurrences: number };
          ignoreExports: unknown[];
          overrides: unknown[];
        };

        expect(body.rules).toEqual({
          'boundary-violation': 'error',
          'circular-dependencies': 'error',
          'duplicate-exports': 'error',
          'unlisted-dependencies': 'error',
          'unresolved-imports': 'error',
          'unused-dependencies': 'error',
          'unused-files': 'error',
          'unused-exports': 'error',
          'unused-types': 'error',
        });
        expect(body.duplicates).toEqual({ mode: 'semantic', threshold: 3, minOccurrences: 3 });
        expect(body.ignoreExports).toEqual([{ file: 'src/**/index.ts', exports: ['*'] }]);
        expect(body.overrides).toEqual([
          { files: ['src/**/index.ts'], rules: { 'unused-types': 'off' } },
        ]);
      }
    });

    it("targets expo-router roots — not classic index.js/App.tsx — in react-native's fallow entry (bug #2)", () => {
      const { fallowFiles } = render(buildPlan('react-native', ''));
      const file = fallowFiles[0];

      if (!file) {
        throw new Error('Expected a rendered fallow file for react-native.');
      }

      const body = JSON.parse(file.content) as { entry: string[] };

      expect(body.entry).toContain('src/app/**/*.{ts,tsx}');
      expect(body.entry).not.toContain('index.js');
      expect(body.entry).not.toContain('App.tsx');
    });

    it('renders no fallow file when a profile declares no fallow config (fallow: null)', () => {
      const base = buildPlan('ts-lib', '');
      const surface = base.surfaces[0];

      if (!surface) {
        throw new Error('Test fixture setup failure: expected a surface.');
      }

      const plan: ProjectPlan = {
        ...base,
        surfaces: [{ ...surface, profile: { ...surface.profile, fallow: null } }],
      };

      expect(render(plan).fallowFiles).toEqual([]);
    });
  });

  describe('eslintSnippet (MSI-REN-5)', () => {
    it('is present in RenderedArtifacts but never written to any RenderedFile', () => {
      const artifacts = render(buildPlan('wails-frontend', 'frontend'));

      expect(artifacts.eslintSnippet).toContain('createRecommendedConfig');
      expect(artifacts.fallowFiles.every((file) => file.content !== artifacts.eslintSnippet)).toBe(true);
    });

    it("builds the wails-frontend snippet from its infrastructure options (single source of truth, MSI-REN-4)", () => {
      const { eslintSnippet } = render(buildPlan('wails-frontend', 'frontend'));

      expect(eslintSnippet).toContain('wailsjs');
      expect(eslintSnippet).toContain('window.go');
    });

    it('omits infrastructure options for profiles that do not declare them', () => {
      const { eslintSnippet } = render(buildPlan('ts-lib', ''));

      expect(eslintSnippet).not.toContain('infrastructure');
      expect(eslintSnippet).toContain('createRecommendedConfig()');
    });
  });
});
