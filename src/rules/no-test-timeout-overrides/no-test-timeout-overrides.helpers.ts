import type { Rule } from 'eslint';
import type { CallExpression, Expression, ObjectExpression, Property, SpreadElement } from 'estree';

import { resolveCallRootIdentifierName } from '../vitest-call-anatomy/index.js';
import {
  defaultVitestHookTimeoutMs,
  defaultVitestTestTimeoutMs,
  hookCallRootNames,
  testCallRootNames,
} from './no-test-timeout-overrides.constants.js';

/** True for the function-expression shapes Vitest accepts as a test/hook callback. */
function isFunctionLike(node: Expression | SpreadElement): boolean {
  return node.type === 'FunctionExpression' || node.type === 'ArrowFunctionExpression';
}

/** Finds a non-computed `Property` by key name in an object literal. */
function findProperty(objectExpression: ObjectExpression, keyName: string): Property | undefined {
  return objectExpression.properties.find(
    (property): property is Property =>
      property.type === 'Property' && !property.computed && property.key.type === 'Identifier' && property.key.name === keyName,
  );
}

/**
 * Reports any argument positioned after the test/hook callback — a
 * value-independent presence ban, since per-call heterogeneity is itself the
 * anti-pattern (a value check is trivially defeated by extracting the
 * number to a constant).
 */
function checkTrailingTimeoutArgument(context: Rule.RuleContext, node: CallExpression, messageId: string): void {
  const { arguments: args } = node;
  const callbackIndex = args.findIndex(isFunctionLike);

  if (callbackIndex === -1) {
    return;
  }

  if (args.length > callbackIndex + 1) {
    context.report({ node, messageId });
  }
}

/**
 * Reports a `timeout` key in an options-object argument that appears BEFORE
 * the test/hook callback — Vitest's `test('x', { timeout }, fn)` shape.
 */
function checkOptionsTimeoutArgument(context: Rule.RuleContext, node: CallExpression): void {
  const { arguments: args } = node;
  const callbackIndex = args.findIndex(isFunctionLike);
  const candidates = callbackIndex === -1 ? args : args.slice(0, callbackIndex);

  for (const arg of candidates) {
    if (arg.type === 'ObjectExpression' && findProperty(arg, 'timeout') !== undefined) {
      context.report({ node, messageId: 'optionsTimeout' });
      return;
    }
  }
}

/** True for a direct, non-curried `vi.setConfig(...)` call. */
function isViSetConfigCall(node: CallExpression): boolean {
  const { callee } = node;
  return (
    callee.type === 'MemberExpression' &&
    !callee.computed &&
    callee.object.type === 'Identifier' &&
    callee.object.name === 'vi' &&
    callee.property.type === 'Identifier' &&
    callee.property.name === 'setConfig'
  );
}

/**
 * Reports `vi.setConfig({ testTimeout / hookTimeout })` — a runtime override
 * of the same regression-detector budget. A dynamic argument
 * (`vi.setConfig(sharedConfig)`) is a documented accepted gap: an ESLint
 * rule cannot resolve its shape statically.
 */
function checkSetConfigCall(context: Rule.RuleContext, node: CallExpression): void {
  const [configArg] = node.arguments;

  if (configArg === undefined || configArg.type !== 'ObjectExpression') {
    return;
  }

  if (findProperty(configArg, 'testTimeout') !== undefined || findProperty(configArg, 'hookTimeout') !== undefined) {
    context.report({ node, messageId: 'setConfigTimeout' });
  }
}

/**
 * Classifies and checks a `CallExpression` against every test-file
 * detection: per-test/hook trailing timeouts, options-object timeouts, and
 * `vi.setConfig` overrides.
 */
export function checkTimeoutCallExpression(context: Rule.RuleContext, node: CallExpression): void {
  const rootName = resolveCallRootIdentifierName(node);

  if (rootName !== null && testCallRootNames.has(rootName)) {
    checkTrailingTimeoutArgument(context, node, 'perTestTimeout');
    checkOptionsTimeoutArgument(context, node);
    return;
  }

  if (rootName === 'describe') {
    checkOptionsTimeoutArgument(context, node);
    return;
  }

  if (rootName !== null && hookCallRootNames.has(rootName)) {
    checkTrailingTimeoutArgument(context, node, 'hookTimeout');
    return;
  }

  if (isViSetConfigCall(node)) {
    checkSetConfigCall(context, node);
  }
}

/** True when a `Property` node's owning object literal is itself the value of a `test` property. */
function isNestedInsideTestProperty(node: Rule.Node & Property): boolean {
  const objectExpression = node.parent;

  if (objectExpression.type !== 'ObjectExpression') {
    return false;
  }

  const owningProperty = objectExpression.parent;

  return (
    owningProperty.type === 'Property' &&
    !owningProperty.computed &&
    owningProperty.key.type === 'Identifier' &&
    owningProperty.key.name === 'test'
  );
}

/**
 * Reports a `testTimeout`/`hookTimeout` property, nested inside a `test:`
 * object literal (the Vitest config shape), whose numeric value RAISES the
 * budget above Vitest's own default. Lowering stays legal — a stricter
 * budget is a better regression detector. Config assembled via variable
 * indirection or `mergeConfig` composition is a documented, fail-safe
 * accepted gap (false negative, never a false positive).
 */
export function checkConfigTimeoutRaiseProperty(context: Rule.RuleContext, node: Rule.Node & Property): void {
  if (node.computed || node.key.type !== 'Identifier') {
    return;
  }

  const keyName = node.key.name;

  if (keyName !== 'testTimeout' && keyName !== 'hookTimeout') {
    return;
  }

  if (node.value.type !== 'Literal' || typeof node.value.value !== 'number') {
    return;
  }

  if (!isNestedInsideTestProperty(node)) {
    return;
  }

  const threshold = keyName === 'testTimeout' ? defaultVitestTestTimeoutMs : defaultVitestHookTimeoutMs;

  if (node.value.value > threshold) {
    context.report({ node, messageId: 'configTimeoutRaise' });
  }
}
