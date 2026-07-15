/**
 * Default specifier prefixes treated as local aliases, never flagged as bare
 * package specifiers. Consumers extend this list via the
 * `localAliasPrefixes` option for project-specific tsconfig path aliases.
 */
export const defaultLocalAliasPrefixes = ['@/', '~/'] as const;
