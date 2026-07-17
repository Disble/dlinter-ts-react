import type { Rule } from 'eslint';
import type { BlockStatement, CallExpression, Program } from 'estree';

import { resolveCallRootIdentifierName } from '../vitest-call-anatomy/index.js';
import type { SpyRestoreContainer, SpyRestoreTrackingState } from './require-spy-restore.types.js';

/** Creates the empty tracking state seeded with the file's Program node as the root container. */
export function createTrackingState(programNode: Program): SpyRestoreTrackingState {
  return {
    programNode,
    containerStack: [],
    satisfyingContainers: new Set(),
    pendingSpies: [],
    afterEachDepth: 0,
  };
}

/** True for a direct `object.property(...)` call, e.g. `vi.spyOn(...)`. */
function isMemberCallOn(node: CallExpression, objectName: string, propertyName: string): boolean {
  const { callee } = node;
  return (
    callee.type === 'MemberExpression' &&
    !callee.computed &&
    callee.object.type === 'Identifier' &&
    callee.object.name === objectName &&
    callee.property.type === 'Identifier' &&
    callee.property.name === propertyName
  );
}

/**
 * True for `describe(...)`, including member/curried and tagged-template
 * forms (`describe.only`, `describe.each(cases)(...)`,
 * `` describe.each`table`(...) ``).
 */
function isDescribeCall(node: CallExpression): boolean {
  return resolveCallRootIdentifierName(node) === 'describe';
}

/** True for a direct `afterEach(...)` call. */
function isAfterEachCall(node: CallExpression): boolean {
  return node.callee.type === 'Identifier' && node.callee.name === 'afterEach';
}

/** True for `vi.spyOn(...)`. */
function isViSpyOnCall(node: CallExpression): boolean {
  return isMemberCallOn(node, 'vi', 'spyOn');
}

/** True for `vi.restoreAllMocks()` — the only satisfier this rule accepts. */
function isRestoreAllMocksCall(node: CallExpression): boolean {
  return isMemberCallOn(node, 'vi', 'restoreAllMocks');
}

/** Finds a describe/afterEach call's function-expression callback block body, if any. */
function findCallbackBlockBody(node: CallExpression): BlockStatement | null {
  const callback = node.arguments.find(
    (arg) => arg.type === 'FunctionExpression' || arg.type === 'ArrowFunctionExpression',
  );

  if (callback === undefined || (callback.type !== 'FunctionExpression' && callback.type !== 'ArrowFunctionExpression')) {
    return null;
  }

  return callback.body.type === 'BlockStatement' ? callback.body : null;
}

function currentContainer(state: SpyRestoreTrackingState): SpyRestoreContainer {
  return state.containerStack[state.containerStack.length - 1] ?? state.programNode;
}

/**
 * Processes a `CallExpression` on enter: pushes a new describe-nesting
 * container, records `vi.spyOn` calls with the FULL ancestor-container
 * chain they need to be satisfied against, tracks entry into an
 * `afterEach` callback, and marks the current container as satisfying when
 * a `vi.restoreAllMocks()` call is found inside one.
 */
export function trackCallExpressionEnter(state: SpyRestoreTrackingState, node: CallExpression): void {
  if (isDescribeCall(node)) {
    const body = findCallbackBlockBody(node);
    if (body !== null) {
      state.containerStack.push(body);
    }
  }

  if (isViSpyOnCall(node)) {
    state.pendingSpies.push({
      node,
      ancestorContainers: [...state.containerStack].reverse().concat(state.programNode),
    });
  }

  if (isAfterEachCall(node)) {
    state.afterEachDepth += 1;
  }

  if (state.afterEachDepth > 0 && isRestoreAllMocksCall(node)) {
    state.satisfyingContainers.add(currentContainer(state));
  }
}

/** Mirrors `trackCallExpressionEnter`'s pushes on the way back out of the tree. */
export function trackCallExpressionExit(state: SpyRestoreTrackingState, node: CallExpression): void {
  if (isAfterEachCall(node)) {
    state.afterEachDepth -= 1;
  }

  if (isDescribeCall(node) && findCallbackBlockBody(node) !== null) {
    state.containerStack.pop();
  }
}

/** Reports every collected spy call whose ancestor-container chain has no satisfying `afterEach`. */
export function reportUnsatisfiedSpies(context: Rule.RuleContext, state: SpyRestoreTrackingState): void {
  for (const { node, ancestorContainers } of state.pendingSpies) {
    const isSatisfied = ancestorContainers.some((container) => state.satisfyingContainers.has(container));

    if (!isSatisfied) {
      context.report({ node, messageId: 'unsatisfiedSpy' });
    }
  }
}
