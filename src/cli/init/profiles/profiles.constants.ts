import type { GateJobContract, StackProfile } from './profiles.types.js';

/** Shared `fallow` gate job — identical script contract across every profile. */
const AUDIT_JOB: GateJobContract = {
  script: 'audit',
  kind: 'run',
  scaffoldScript: 'fallow audit --quiet',
};

/**
 * Registered stack profiles, in detection precedence order (MSI-DET-2):
 * `wails.json` \> `next.config.*` \> (`app.json` + expo/react-native dep) \>
 * (`react` + `react-dom` deps) \> `ts-lib` terminal fallback. Adding a sixth
 * profile is one array entry — no branch anywhere else changes (ADR-1).
 */
export const STACK_PROFILES: readonly StackProfile[] = [
  {
    name: 'wails-frontend',
    detect: { markerFiles: ['wails.json'] },
    surfaceDir: 'frontend',
    gateJobs: [
      AUDIT_JOB,
      { script: 'lint', kind: 'run', scaffoldScript: 'eslint .' },
      { script: 'typecheck', kind: 'run', scaffoldScript: 'tsc --noEmit' },
      { script: 'test', kind: 'run', scaffoldScript: 'vitest run' },
    ],
    fallow: { entryPoints: ['src/main.tsx'], ignorePatterns: ['wailsjs/**', 'dist/**'] },
    // Single source of truth for wails knowledge (design section 6): the
    // same patterns drive both this fallow ignore and the eslint boundary
    // snippet the renderer suggests (PR-3) — they cannot drift apart.
    infrastructure: { importPatterns: ['(^|/)wailsjs(/|$)'], runtimeGlobals: ['window.go'] },
  },
  {
    name: 'nextjs',
    detect: { markerFiles: ['next.config.js', 'next.config.mjs', 'next.config.ts', 'next.config.cjs'] },
    surfaceDir: '',
    gateJobs: [
      AUDIT_JOB,
      { script: 'lint', kind: 'run', scaffoldScript: 'next lint' },
      { script: 'typecheck', kind: 'run', scaffoldScript: 'tsc --noEmit' },
      { script: 'test', kind: 'run', scaffoldScript: 'vitest run' },
    ],
    fallow: { entryPoints: ['app/**', 'pages/**'], ignorePatterns: ['.next/**', 'node_modules/**'] },
  },
  {
    name: 'react-native',
    // Mirrors autoreas-mobile: expo lint + jest, no fallow precedent yet.
    detect: { markerFiles: ['app.json'], dependencies: ['expo', 'react-native'] },
    surfaceDir: '',
    gateJobs: [
      AUDIT_JOB,
      { script: 'lint', kind: 'run', scaffoldScript: 'expo lint' },
      { script: 'typecheck', kind: 'run', scaffoldScript: 'tsc --noEmit' },
      { script: 'test', kind: 'run', scaffoldScript: 'jest' },
    ],
    // expo-router is file-based: every route under app/ (or src/app/) is an
    // entry, auto-registered via `expo-router/entry` — there is no single
    // index.js/App.tsx to point at. Both layouts are listed so the profile
    // fits root-app and src/app projects without render-time detection; a glob
    // whose base dir is absent simply matches nothing.
    fallow: {
      entryPoints: ['src/app/**/*.{ts,tsx}', 'app/**/*.{ts,tsx}'],
      ignorePatterns: ['android/**', 'ios/**', '.expo/**'],
    },
  },
  {
    name: 'react-spa',
    // No marker file — an SPA has no unique file signature. Both deps are
    // required: unlike react-native's any-of, a bare `react` dep alone is
    // too weak a signal (every profile above also depends on React).
    detect: { markerFiles: [], dependencies: ['react', 'react-dom'], requireAllDependencies: true },
    surfaceDir: '',
    gateJobs: [
      AUDIT_JOB,
      { script: 'lint', kind: 'run', scaffoldScript: 'eslint .' },
      { script: 'typecheck', kind: 'run', scaffoldScript: 'tsc --noEmit' },
      { script: 'test', kind: 'run', scaffoldScript: 'vitest run' },
    ],
    fallow: { entryPoints: ['src/main.tsx', 'index.html'], ignorePatterns: ['dist/**'] },
  },
  {
    name: 'ts-lib',
    // Terminal fallback: no marker requirement, matches unconditionally.
    // Correct ONLY because it is last in precedence order (ADR-5).
    detect: { markerFiles: [] },
    surfaceDir: '',
    gateJobs: [
      AUDIT_JOB,
      { script: 'lint', kind: 'run', scaffoldScript: 'eslint .' },
      { script: 'typecheck', kind: 'run', scaffoldScript: 'tsc --noEmit' },
      { script: 'test', kind: 'run', scaffoldScript: 'vitest run' },
    ],
    fallow: { entryPoints: ['src/index.ts'], ignorePatterns: ['dist/**'] },
  },
];
