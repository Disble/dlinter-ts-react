import { STACK_PROFILES } from './profiles.constants.js';
import type { DetectionInput, DetectionSignals, ProfileName } from './profiles.types.js';

function matchesSignals(signals: DetectionSignals, input: DetectionInput): boolean {
  const markerMatches =
    signals.markerFiles.length === 0 || signals.markerFiles.some((file) => input.markerFiles.includes(file));

  if (!markerMatches) {
    return false;
  }

  if (!signals.dependencies || signals.dependencies.length === 0) {
    return true;
  }

  return signals.requireAllDependencies
    ? signals.dependencies.every((dependency) => input.dependencies.includes(dependency))
    : signals.dependencies.some((dependency) => input.dependencies.includes(dependency));
}

/**
 * Resolves the stack profile name from a plain signals snapshot — no
 * filesystem access. Scans `STACK_PROFILES` in precedence order and returns
 * the first profile whose signature matches; `ts-lib` is the guaranteed
 * terminal fallback (MSI-DET-2 step 5, MSI-DET-6).
 * @param input - marker files and dependency names present in the project.
 * @returns the resolved profile's name.
 */
export function matchProfile(input: DetectionInput): ProfileName {
  for (const profile of STACK_PROFILES) {
    if (matchesSignals(profile.detect, input)) {
      return profile.name;
    }
  }

  // Defensive terminal default (MSI-DET-6): ts-lib's own signature already
  // matches unconditionally and is last in precedence order, so this line
  // only guards against a future registry edit breaking that invariant.
  return 'ts-lib';
}
