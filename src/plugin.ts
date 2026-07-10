import type { ESLint } from 'eslint';

import { rules } from './rules/index.js';

/**
 * Plugin core shared by every preset: metadata plus the dlinter rule registry.
 * Presets receive this object so config factories never import the package
 * entrypoint back (which would create a module cycle).
 */
export const pluginBase: ESLint.Plugin = {
  meta: {
    name: 'dlinter-ts-react',
    version: '0.1.0',
  },
  rules,
};
