import type { ESLint } from 'eslint';

import { compositionOnlyDelivery } from './rules/composition-only-delivery/index.js';
import { folderOwnership } from './rules/folder-ownership/index.js';
import { hookAnatomy } from './rules/hook-anatomy/index.js';
import { noInfrastructureInView } from './rules/no-infrastructure-in-view.js';
import { noPartialPackageMock } from './rules/no-partial-package-mock/index.js';
import { noTestTimeoutOverrides } from './rules/no-test-timeout-overrides/index.js';
import { noViewEffects } from './rules/no-view-effects/index.js';
import { pureIndexBarrel } from './rules/pure-index-barrel.js';
import { readonlyProps } from './rules/readonly-props/index.js';
import { requireExportedVariableJsdoc } from './rules/require-exported-variable-jsdoc.js';
import { requireSpyRestore } from './rules/require-spy-restore/index.js';
import { strictColocation } from './rules/strict-colocation/index.js';

/**
 * Plugin core shared by every preset: metadata plus the dlinter rule registry
 * keyed by published rule name. Presets receive this object so config
 * factories never import the package entrypoint back (which would create a
 * module cycle).
 */
export const pluginBase: ESLint.Plugin = {
  meta: {
    name: 'dlinter-ts-react',
    version: '0.1.0',
  },
  rules: {
    'composition-only-delivery': compositionOnlyDelivery,
    'folder-ownership': folderOwnership,
    'hook-anatomy': hookAnatomy,
    'no-infrastructure-in-view': noInfrastructureInView,
    'no-partial-package-mock': noPartialPackageMock,
    'no-test-timeout-overrides': noTestTimeoutOverrides,
    'no-view-effects': noViewEffects,
    'pure-index-barrel': pureIndexBarrel,
    'readonly-props': readonlyProps,
    'require-exported-variable-jsdoc': requireExportedVariableJsdoc,
    'require-spy-restore': requireSpyRestore,
    'strict-colocation': strictColocation,
  },
};
