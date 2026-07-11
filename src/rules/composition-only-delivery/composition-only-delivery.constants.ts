/** Matches every built-in React hook name, including bare `use`. */
export const reactHookNamePattern =
  '^use(State|Reducer|Effect|LayoutEffect|InsertionEffect|SyncExternalStore|Memo|Callback|Ref|Context|Transition|DeferredValue|ImperativeHandle|DebugValue|Id|Optimistic|ActionState)?$';

/** Matches module specifiers that resolve to a custom `use-*` hook file. */
export const customHookModulePattern = /(^|\/)use-[^/]+$/u;
