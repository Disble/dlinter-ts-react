import type { Rule } from 'eslint';

import { compositionOnlyDelivery } from './composition-only-delivery.js';
import { hookAnatomy } from './hook-anatomy.js';
import { noInfrastructureInView } from './no-infrastructure-in-view.js';
import { noViewEffects } from './no-view-effects.js';
import { readonlyProps } from './readonly-props.js';
import { requireExportedVariableJsdoc } from './require-exported-variable-jsdoc.js';
import { strictColocation } from './strict-colocation.js';

/**
 * Registry of every first-class dlinter rule, keyed by its published rule name.
 */
export const rules: Record<string, Rule.RuleModule> = {
  'composition-only-delivery': compositionOnlyDelivery,
  'hook-anatomy': hookAnatomy,
  'no-infrastructure-in-view': noInfrastructureInView,
  'no-view-effects': noViewEffects,
  'readonly-props': readonlyProps,
  'require-exported-variable-jsdoc': requireExportedVariableJsdoc,
  'strict-colocation': strictColocation,
};
