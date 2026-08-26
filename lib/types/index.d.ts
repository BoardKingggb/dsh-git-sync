/**
 * dsh-git-sync: per-session opt-in multi-device sync of session/memory data
 * over git. Nothing syncs until the user opts a session in AND turns the master
 * switch on. Conflicts resolve by keeping the local copy (last-write-wins).
 * @module @deepseek-ai/dsh-git-sync
 */
import type { Context } from '@deepseek-ai/cordis';
import { GitSync } from './service.ts';
import { type Config as ConfigShape } from './config.ts';
declare module '@deepseek-ai/cordis' {
    interface Context {
        gitSync: GitSync;
    }
}
export { Config } from './config.ts';
export { GitSync } from './service.ts';
export { GitSyncEngine, type SessionSnapshot } from './engine.ts';
/** Cordis function-plugin name. */
export declare const name = "git-sync";
/** Services required before the sync service and command can run. */
export declare const inject: string[];
/**
 * Install the sync service, the `/sync` command, and the periodic timer.
 * @param ctx - Cordis context.
 * @param config - validated plugin config (loader has already applied defaults).
 */
export declare function apply(ctx: Context, config: ConfigShape): void;
//# sourceMappingURL=index.d.ts.map