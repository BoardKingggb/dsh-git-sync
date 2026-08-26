/**
 * Package-owned dsh-git-sync invariant: every session that is opted into sync
 * must have its artifact present in the mirror (manifest → mirror ownership).
 * @module @deepseek-ai/dsh-git-sync/invariant
 */
import type { Context } from '@deepseek-ai/cordis';
/** Cordis invariant-companion plugin name. */
export declare const name = "git-sync-invariant";
/** Services required before reserving this package's invariant ownership. */
export declare const inject: string[];
/**
 * Register the package-owned invariant companion.
 * @param ctx - Cordis context carrying the invariant registry.
 * @returns Exact registration disposer after child setup succeeds.
 */
export declare const apply: (ctx: Context) => Promise<() => void>;
//# sourceMappingURL=invariant.d.ts.map