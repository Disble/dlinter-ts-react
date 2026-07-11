/** Selector fragment matching parameters annotated with a bare `*Props` type reference. */
export const propsBoundary =
  '[typeAnnotation.typeAnnotation.type="TSTypeReference"][typeAnnotation.typeAnnotation.typeName.name=/Props$/]';
