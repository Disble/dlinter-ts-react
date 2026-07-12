import type { FallowConfig, GateJobContract, StackProfile } from '../profiles/profiles.types.js';
import type { RunnerAdapter } from '../runners/runners.types.js';
import { ESLINT_SNIPPET_PACKAGE, FALLOW_SCHEMA_URL, LEFTHOOK_JOB_NAME_BY_SCRIPT } from './render.constants.js';
import type { RenderedFile, RenderedJob } from './render.types.js';

function renderJobName(script: string): string {
  return LEFTHOOK_JOB_NAME_BY_SCRIPT[script] ?? script;
}

function renderJobRun(runner: RunnerAdapter, job: GateJobContract): string {
  if (job.kind === 'exec') {
    if (!job.exec) {
      throw new Error(`GateJobContract for script "${job.script}" declares kind 'exec' without an exec descriptor.`);
    }

    return runner.exec(job.exec.bin, job.exec.args);
  }

  return runner.run(job.script);
}

/**
 * Renders one profile's gate jobs as lefthook job entries (MSI-REN-1): every
 * job invokes `runner.run`/`runner.exec`, never a raw binary call. Jobs
 * targeting a non-root surface carry lefthook's own `root:` key (ADR-3)
 * instead of a baked-in `cd` — MSI-REN-2's runner-correct subdirectory
 * execution is proven separately by an executable round-trip test, not by
 * string-matching a per-adapter flag here.
 * @param runner - the plan's resolved runner adapter.
 * @param profile - the resolved stack profile whose gate jobs to render.
 * @param surfaceDir - the resolved surface directory (`''` = root).
 * @returns the rendered lefthook jobs, in registry order.
 */
export function renderLefthookJobs(
  runner: RunnerAdapter,
  profile: StackProfile,
  surfaceDir: string,
): readonly RenderedJob[] {
  return profile.gateJobs.map((job) => ({
    name: renderJobName(job.script),
    run: renderJobRun(runner, job),
    ...(surfaceDir === '' ? {} : { root: surfaceDir }),
  }));
}

/**
 * Renders the `.fallowrc.json` skeleton for a profile's resolved surface
 * (MSI-REN-3). `FallowConfig.entryPoints` maps to fallow's real top-level
 * `entry` key, NOT `entryPoints` — fallow's own schema has no top-level
 * `entryPoints` property (`additionalProperties: false` rejects it); only
 * its per-plugin `entryPoints` sub-key happens to share the name. Using the
 * wrong key would scaffold a file fallow itself refuses to load.
 * @param surfaceDir - the resolved surface directory (`''` = root).
 * @param fallow - the profile's fallow scaffold data, or `null` to opt out.
 * @returns the rendered file, or `null` when the profile has no fallow config.
 */
export function renderFallowFile(surfaceDir: string, fallow: FallowConfig | null): RenderedFile | null {
  if (!fallow) {
    return null;
  }

  const body = {
    $schema: FALLOW_SCHEMA_URL,
    entry: [...fallow.entryPoints],
    ignorePatterns: [...fallow.ignorePatterns],
  };

  return {
    path: surfaceDir === '' ? '.fallowrc.json' : `${surfaceDir}/.fallowrc.json`,
    content: `${JSON.stringify(body, null, 2)}\n`,
  };
}

/**
 * Derives the scaffold-if-absent `package.json` scripts a profile's gate
 * jobs expect (MSI-SCR-1). A `null` `scaffoldScript` opts a job out of
 * scaffolding entirely.
 * @param profile - the resolved stack profile.
 * @returns a script-name to default-command map.
 */
export function renderScripts(profile: StackProfile): Readonly<Record<string, string>> {
  const scripts: Record<string, string> = {};

  for (const job of profile.gateJobs) {
    if (job.scaffoldScript !== null) {
      scripts[job.script] = job.scaffoldScript;
    }
  }

  return scripts;
}

/**
 * Renders the advisory ESLint config suggestion as TEXT (ADR-2) — this
 * never imports `configs/` (enforced layer contract) and is never written
 * to disk (MSI-REN-5); the profile's `infrastructure` field is the single
 * source for both this snippet and the fallow ignore it mirrors.
 * @param profile - the resolved stack profile.
 * @returns the suggested `eslint.config.js` snippet.
 */
export function renderEslintSnippet(profile: StackProfile): string {
  const options = profile.infrastructure
    ? `{
    infrastructure: {
      importPatterns: ${JSON.stringify([...profile.infrastructure.importPatterns])},
      runtimeGlobals: ${JSON.stringify([...profile.infrastructure.runtimeGlobals])},
    },
  }`
    : '';

  return [
    `import { createRecommendedConfig } from '${ESLINT_SNIPPET_PACKAGE}';`,
    '',
    'export default [',
    `  ...createRecommendedConfig(${options}),`,
    '];',
    '',
  ].join('\n');
}
