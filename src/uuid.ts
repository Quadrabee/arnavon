import { randomUUID } from 'node:crypto';

/**
 * Minimal UUID helpers backed by node:crypto.
 *
 * The `uuid` package went ESM-only in v11, which cannot be `require`d from
 * this CommonJS build. Node has provided everything we actually need since
 * v14.17, so we use the built-in instead of carrying the dependency.
 */

const UUID_RE =
  /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|00000000-0000-0000-0000-000000000000)$/i;

/** Generate a random (v4) UUID. */
export const v4 = (): string => randomUUID();

/** Whether `value` is a well-formed UUID string. */
export const validate = (value: unknown): boolean =>
  typeof value === 'string' && UUID_RE.test(value);
