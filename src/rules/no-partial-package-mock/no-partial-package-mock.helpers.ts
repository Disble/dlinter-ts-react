import type { Rule, Scope } from 'eslint';
import type { CallExpression, Expression, Pattern, SpreadElement } from 'estree';

/**
 * Narrows a call argument to a plain expression, excluding spread elements
 * which can never be a static specifier or a factory.
 */
function asExpression(argument: Expression | SpreadElement | undefined): Expression | undefined {
  return argument !== undefined && argument.type !== 'SpreadElement' ? argument : undefined;
}

/**
 * Extracts the literal string value of a specifier argument when it is
 * STATIC — a plain string `Literal`, or a `TemplateLiteral` with zero
 * interpolated expressions (a backtick string is otherwise indistinguishable
 * from a dynamic one). Returns null for any other, non-static shape.
 */
function getStaticSpecifierValue(node: Expression | undefined): string | null {
  if (node === undefined) {
    return null;
  }

  if (node.type === 'Literal' && typeof node.value === 'string') {
    return node.value;
  }

  if (node.type === 'TemplateLiteral' && node.expressions.length === 0) {
    return node.quasis[0]?.value.cooked ?? null;
  }

  return null;
}

/**
 * A specifier is "bare" when it does not resolve relative to the importing
 * file (`.`/`/`) and does not match a configured local-alias prefix. Bare
 * specifiers resolve through Vitest's module loader, which is where the
 * partial-mock bug lives.
 */
function isBareSpecifier(specifier: string, localAliasPrefixes: readonly string[]): boolean {
  if (specifier.startsWith('.') || specifier.startsWith('/')) {
    return false;
  }

  return !localAliasPrefixes.some((prefix) => specifier.startsWith(prefix));
}

/**
 * Resolves a specifier argument to its bare package specifier, or null when
 * the argument is non-static, relative, or matches a local-alias prefix.
 */
function getStaticBareSpecifier(
  node: Expression | SpreadElement | undefined,
  localAliasPrefixes: readonly string[],
): string | null {
  const specifier = getStaticSpecifierValue(asExpression(node));

  if (specifier === null || !isBareSpecifier(specifier, localAliasPrefixes)) {
    return null;
  }

  return specifier;
}

/**
 * Collects every identifier name bound by a parameter pattern — plain
 * identifiers, object/array destructuring, defaults, and rest elements — so
 * usage of any of them counts as the parameter being referenced.
 */
function collectPatternBoundNames(pattern: Pattern): string[] {
  switch (pattern.type) {
    case 'Identifier':
      return [pattern.name];
    case 'ObjectPattern':
      return pattern.properties.flatMap((property) =>
        property.type === 'RestElement'
          ? collectPatternBoundNames(property.argument)
          : collectPatternBoundNames(property.value),
      );
    case 'ArrayPattern':
      return pattern.elements.flatMap((element) => (element === null ? [] : collectPatternBoundNames(element)));
    case 'AssignmentPattern':
      return collectPatternBoundNames(pattern.left);
    case 'RestElement':
      return collectPatternBoundNames(pattern.argument);
    default:
      return [];
  }
}

/**
 * True when any of the given names has at least one read/write reference in
 * the provided scope — i.e. the factory actually reads from the parameter
 * rather than merely declaring it.
 */
function isAnyNameReferenced(scope: Scope.Scope, names: readonly string[]): boolean {
  return names.some((name) => {
    const variable = scope.variables.find((candidate) => candidate.name === name);
    return variable !== undefined && variable.references.length > 0;
  });
}

/**
 * Reports a `vi.mock`/`vi.doMock` call whose bare-specifier factory
 * references its first parameter — the module-loader bug this rule guards.
 * An unused declared parameter never invokes the loader path and is not
 * flagged.
 */
export function checkMockFactoryCall(
  context: Rule.RuleContext,
  node: CallExpression,
  localAliasPrefixes: readonly string[],
): void {
  const [specifierArg, factoryArg] = node.arguments;
  const specifier = getStaticBareSpecifier(specifierArg, localAliasPrefixes);

  if (specifier === null || factoryArg === undefined || factoryArg.type === 'SpreadElement') {
    return;
  }

  if (factoryArg.type !== 'FunctionExpression' && factoryArg.type !== 'ArrowFunctionExpression') {
    return;
  }

  const [firstParam] = factoryArg.params;

  if (firstParam === undefined) {
    return;
  }

  const boundNames = collectPatternBoundNames(firstParam);
  const scope = context.sourceCode.getScope(factoryArg);

  if (isAnyNameReferenced(scope, boundNames)) {
    context.report({ node, messageId: 'partialPackageMock' });
  }
}

/**
 * Reports a `vi.importActual` call on a static bare package specifier — it
 * reproduces the identical module-loader bug even when called from a
 * zero-parameter factory.
 */
export function checkImportActualCall(
  context: Rule.RuleContext,
  node: CallExpression,
  localAliasPrefixes: readonly string[],
): void {
  const [specifierArg] = node.arguments;
  const specifier = getStaticBareSpecifier(specifierArg, localAliasPrefixes);

  if (specifier !== null) {
    context.report({ node, messageId: 'importActualPackage' });
  }
}
