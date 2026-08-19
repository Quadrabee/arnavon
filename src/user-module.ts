import { register } from 'tsx/cjs/api';

/**
 * `require()` a user-supplied module (a nodejs runner, a `schema.world.js`, a
 * non-YAML config), transparently transpiling TypeScript and ESM syntax.
 *
 * This replaces the `@babel/register` hook Arnavon used to install globally.
 * The tsx hook is registered only for the duration of the load, so that:
 *   - it never intercepts the rest of the dependency graph (some packages are
 *     ESM-only and use top-level await, which cannot be transpiled to CJS);
 *   - the loaded module still lands in the normal `require` cache, keeping a
 *     single instance shared with any other `require` of the same path.
 *
 * `id` should be an absolute path: resolution is relative to this file.
 */
export const requireUserModule = (id: string): { default?: unknown } => {
  const unregister = register();
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require(id);
  } finally {
    unregister();
  }
};

/** As `requireUserModule`, unwrapping a default export when there is one. */
export const requireUserModuleDefault = (id: string): unknown => {
  const module = requireUserModule(id);
  return module && module.default ? module.default : module;
};
