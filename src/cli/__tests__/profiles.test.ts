import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { resolveProfile } from '../init/profiles/index.js';
import { STACK_PROFILES } from '../init/profiles/profiles.constants.js';
import { matchProfile } from '../init/profiles/profiles.helpers.js';
import type { DetectionInput } from '../init/profiles/profiles.types.js';

describe('STACK_PROFILES', () => {
  it('registers exactly 5 unique profiles in wails-frontend > nextjs > react-native > react-spa > ts-lib precedence order', () => {
    const names = STACK_PROFILES.map((profile) => profile.name);

    expect(names).toEqual(['wails-frontend', 'nextjs', 'react-native', 'react-spa', 'ts-lib']);
    expect(new Set(names).size).toBe(5);
  });

  it('gives every profile exactly 4 gate jobs named audit, lint, typecheck, test', () => {
    for (const profile of STACK_PROFILES) {
      expect(profile.gateJobs.map((job) => job.script)).toEqual(['audit', 'lint', 'typecheck', 'test']);
    }
  });

  it('scopes infrastructure knowledge to wails-frontend only', () => {
    const withInfrastructure = STACK_PROFILES.filter((profile) => profile.infrastructure).map(
      (profile) => profile.name,
    );

    expect(withInfrastructure).toEqual(['wails-frontend']);
  });

  it("resolves wails-frontend's surface to frontend, all others to project root", () => {
    const surfaceByName = Object.fromEntries(STACK_PROFILES.map((profile) => [profile.name, profile.surfaceDir]));

    expect(surfaceByName['wails-frontend']).toBe('frontend');
    expect(surfaceByName['nextjs']).toBe('');
    expect(surfaceByName['react-native']).toBe('');
    expect(surfaceByName['react-spa']).toBe('');
    expect(surfaceByName['ts-lib']).toBe('');
  });

  it("includes a wailsjs/** pattern in wails-frontend's fallow ignorePatterns (MSI-REN-4)", () => {
    const wails = STACK_PROFILES.find((profile) => profile.name === 'wails-frontend');

    expect(wails?.fallow?.ignorePatterns).toContain('wailsjs/**');
  });
});

describe('matchProfile', () => {
  const empty: DetectionInput = { markerFiles: [], dependencies: [] };

  it('matches wails-frontend on wails.json alone', () => {
    expect(matchProfile({ ...empty, markerFiles: ['wails.json'] })).toBe('wails-frontend');
  });

  it('prefers wails-frontend over nextjs when both markers are present (first-match-wins, ADR-5)', () => {
    expect(matchProfile({ ...empty, markerFiles: ['wails.json', 'next.config.js'] })).toBe('wails-frontend');
  });

  it('matches nextjs on any next.config variant', () => {
    expect(matchProfile({ ...empty, markerFiles: ['next.config.mjs'] })).toBe('nextjs');
  });

  it('matches react-native on app.json plus the expo dependency', () => {
    expect(matchProfile({ markerFiles: ['app.json'], dependencies: ['expo'] })).toBe('react-native');
  });

  it('matches react-native on app.json plus the react-native dependency', () => {
    expect(matchProfile({ markerFiles: ['app.json'], dependencies: ['react-native'] })).toBe('react-native');
  });

  it('does not match react-native on app.json alone, without expo or react-native deps', () => {
    expect(matchProfile({ markerFiles: ['app.json'], dependencies: [] })).toBe('ts-lib');
  });

  it('matches react-spa on both react and react-dom dependencies, with no marker file', () => {
    expect(matchProfile({ markerFiles: [], dependencies: ['react', 'react-dom'] })).toBe('react-spa');
  });

  it('does not match react-spa on react alone, missing react-dom (AND semantics, MSI-DET-2 step 4)', () => {
    expect(matchProfile({ markerFiles: [], dependencies: ['react'] })).toBe('ts-lib');
  });

  it('falls back to ts-lib when no signals match (terminal, never "no match", MSI-DET-2 step 5)', () => {
    expect(matchProfile(empty)).toBe('ts-lib');
  });
});

describe('resolveProfile', () => {
  let projectRoot = '';

  beforeEach(() => {
    projectRoot = mkdtempSync(path.join(tmpdir(), 'dlinter-profiles-'));
  });

  afterEach(() => {
    rmSync(projectRoot, { recursive: true, force: true });
  });

  it('resolves wails-frontend from a real wails.json on disk', () => {
    writeFileSync(path.join(projectRoot, 'wails.json'), '{}');

    expect(resolveProfile(projectRoot).name).toBe('wails-frontend');
  });

  it('resolves react-spa from real package.json dependencies', () => {
    writeFileSync(
      path.join(projectRoot, 'package.json'),
      JSON.stringify({ dependencies: { react: '^18.0.0', 'react-dom': '^18.0.0' } }),
    );

    expect(resolveProfile(projectRoot).name).toBe('react-spa');
  });

  it('defaults to ts-lib when no signals are present', () => {
    writeFileSync(path.join(projectRoot, 'package.json'), '{}');

    expect(resolveProfile(projectRoot).name).toBe('ts-lib');
  });

  it('honors an explicit override, ignoring signals on disk', () => {
    writeFileSync(path.join(projectRoot, 'wails.json'), '{}');

    expect(resolveProfile(projectRoot, 'react-spa').name).toBe('react-spa');
  });

  it('rejects an unknown override before touching the filesystem', () => {
    expect(() => resolveProfile(projectRoot, 'bogus-profile')).toThrow(/Unknown --profile "bogus-profile"/);
  });
});
