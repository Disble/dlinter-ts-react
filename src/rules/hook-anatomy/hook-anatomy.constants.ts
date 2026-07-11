/** Selector prefix targeting the body of every exported `use*` hook declaration. */
export const hookBlock = 'ExportNamedDeclaration > FunctionDeclaration[id.name=/^use[A-Z0-9]/] > BlockStatement';
