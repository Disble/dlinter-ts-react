import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import type { ProjectPlan } from '../detect/detect.types.js';

/** Ensures the selected surface can run the generated Vitest mutation harness. */
export function validateMutationCapability(plan: ProjectPlan): void {
  if (!plan.testMutator) {
    return;
  }

  const surface = plan.surfaces[0];

  if (!surface) {
    throw new Error('Cannot validate mutation capability without a resolved surface.');
  }

  const manifestPath = path.join(plan.cwd, surface.dir, 'package.json');

  if (!existsSync(manifestPath)) {
    throw new Error('--test-mutator requires Vitest in the resolved surface package.json.');
  }

  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };

  if (!Object.hasOwn(manifest.dependencies ?? {}, 'vitest') && !Object.hasOwn(manifest.devDependencies ?? {}, 'vitest')) {
    throw new Error('--test-mutator requires Vitest in the resolved surface package.json.');
  }
}
