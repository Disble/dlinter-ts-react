import type { CallExpression, Expression, Super } from 'estree';

/**
 * Unwraps the curried `.each`/`.for` call layer that Vitest's tagged-API
 * accepts in two equivalent shapes: `test.each(cases)('name', fn, ...)` is a
 * `CallExpression` whose callee is itself a `CallExpression`
 * (`test.each(cases)`), while `` test.each`table`('name', fn, ...) `` is a
 * `CallExpression` whose callee is a `TaggedTemplateExpression`
 * (`` test.each`table` ``). Either inner callee/tag carries the root
 * identifier used to classify the call; a direct, non-curried call returns
 * its own callee unchanged.
 */
function unwrapCurriedOrTaggedCallee(callee: Expression | Super): Expression | Super {
  if (callee.type === 'CallExpression') {
    return callee.callee;
  }

  if (callee.type === 'TaggedTemplateExpression') {
    return callee.tag;
  }

  return callee;
}

/** Walks a (possibly chained) member-expression callee down to its root identifier name. */
function resolveRootIdentifierName(expr: Expression | Super): string | null {
  if (expr.type === 'Super') {
    return null;
  }

  if (expr.type === 'Identifier') {
    return expr.name;
  }

  if (expr.type === 'MemberExpression' && !expr.computed) {
    return resolveRootIdentifierName(expr.object);
  }

  return null;
}

/**
 * Resolves the root identifier name of a `CallExpression`'s callee, unwrapping
 * curried and tagged-template `.each`/`.for` forms first — e.g. `describe`
 * for `describe(...)`, `describe.only(...)`, `describe.each(cases)(...)`, and
 * `` describe.each`table`(...) ``. Returns `null` when no static root
 * identifier can be resolved (e.g. a computed member access or `super`).
 */
export function resolveCallRootIdentifierName(node: CallExpression): string | null {
  return resolveRootIdentifierName(unwrapCurriedOrTaggedCallee(node.callee));
}
