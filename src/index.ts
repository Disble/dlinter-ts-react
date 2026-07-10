import type { Linter } from 'eslint';

import { createDumbUiConfig } from './configs/dumb-ui.js';
import { createRecommendedConfig } from './configs/recommended.js';
import { pluginBase } from './plugin.js';

/**
 * Architecture-concept presets exposed to consumers as flat config arrays.
 * `recommended` composes the full governance stack with default options;
 * projects with an infrastructure edge use `createRecommendedConfig` instead.
 */
const configs: Record<string, Linter.Config[]> = {
  'dumb-ui': createDumbUiConfig(pluginBase),
  recommended: createRecommendedConfig(),
};

const dlinter = {
  ...pluginBase,
  configs,
};

export default dlinter;
export { createRecommendedConfig };
export type { InfrastructureBoundaryOptions, RecommendedConfigOptions } from './configs/recommended.types.js';
