/**
 * dsh-git-sync client half, browser half: one settings card in
 * Settings → Plugins → Plugin configuration that edits the `git-sync`
 * namespace the host plugin registered.
 * @module @deepseek-ai/dsh-client-ui-git-sync
 */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client';
import { type SyncKey } from './locales.ts';
export { GitSyncCard } from './GitSyncCard.tsx';
export { GIT_SYNC_NS, GitSyncCardController } from './git-sync-card.ts';
export type { SyncKey } from './locales.ts';
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface LocaleNamespaceMap {
        /** The dsh-git-sync settings card copy. */
        gitSync: SyncKey;
    }
}
/** Required services for locale registration, the settings scope, and the card slot. */
export declare const inject: string[];
/**
 * Client plugin body: register the dictionary and the settings card.
 * @param ctx - client root context.
 */
export declare function apply(ctx: ClientContext): void;
//# sourceMappingURL=index.d.ts.map