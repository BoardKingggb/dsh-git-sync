/**
 * The git-sync plugin's settings card: toggle the master switch, set the GitHub
 * remote, branch, interval, and auto-create flag, and save them into the
 * `git-sync` settings namespace.
 * @module @deepseek-ai/dsh-client-ui-git-sync/GitSyncCard
 */
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
import type { GitSyncCardFace } from './git-sync-card.ts';
import { NS } from './locales.ts';
export type GitSyncCardProps = PropsRuntime<'settings.plugin.item'> & PropsLocale<typeof NS> & InjectFace<GitSyncCardFace>;
/**
 * Render the git-sync settings card.
 * @param props - locale copy, the card snapshot, and its form actions.
 * @returns the card, or nothing when the namespace is not served.
 */
export declare function GitSyncCard(props: GitSyncCardProps): import("react").JSX.Element | null;
export type { SyncKey } from './locales.ts';
//# sourceMappingURL=GitSyncCard.d.ts.map