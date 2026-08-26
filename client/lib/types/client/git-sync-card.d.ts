/**
 * The git-sync settings card controller: stages edits over the `git-sync`
 * namespace scope and writes them on save. Self-contained (no dependency on the
 * ui-settings-plugins card internals): booleans render as checkboxes, text and
 * numbers as inputs.
 * @module @deepseek-ai/dsh-client-ui-git-sync/git-sync-card
 */
import type { SettingsScope } from '@deepseek-ai/dsh-client-runtime/client';
import { type SnapshotStore } from '@deepseek-ai/dsh-client-runtime/client';
/** The settings namespace the host dsh-git-sync plugin registered. */
export declare const GIT_SYNC_NS = "git-sync";
/** The editable slice of the git-sync settings section. */
export interface GitSyncSettings {
    enabled?: boolean;
    remoteUrl?: string;
    branch?: string;
    intervalMinutes?: number;
    autoCreateRepo?: boolean;
    loginRequest?: number;
    statusRequest?: number;
    authStatus?: string;
}
/** One control's rendered state. */
export interface GitSyncFieldState {
    value: boolean | string | number;
    overridden: boolean;
}
/** The card's full snapshot. */
export interface GitSyncCardState {
    available: boolean;
    writable: boolean;
    dirty: boolean;
    saving: boolean;
    failed: boolean;
    authStatus: string;
    enabled: GitSyncFieldState;
    remoteUrl: GitSyncFieldState;
    branch: GitSyncFieldState;
    intervalMinutes: GitSyncFieldState;
    autoCreateRepo: GitSyncFieldState;
}
/** Write actions the card's slot entry injects. */
export interface GitSyncCardActions {
    edit: (field: string, value: boolean | string | number) => void;
    save: () => void;
    discard: () => void;
    /** Ask the host to open the GitHub browser login. */
    login: () => void;
    /** Ask the host to re-check the GitHub auth status. */
    refreshStatus: () => void;
}
/** The registration-side face the card's slot entry injects. */
export interface GitSyncCardFace extends GitSyncCardActions {
    hooks: {
        gitSyncCard: SnapshotStore<GitSyncCardState>;
    };
}
/** Bridges the `git-sync` scope onto the card's staged form. */
export declare class GitSyncCardController {
    private readonly scope;
    private readonly store;
    private readonly drafts;
    private saving;
    private failed;
    /** @param scope - the bound settings scope for the `git-sync` namespace. */
    constructor(scope: SettingsScope<GitSyncSettings>);
    /** Build the face the card's slot registration injects. */
    inject(): GitSyncCardFace;
    private sectionValue;
    private userHas;
    private fieldState;
    private projection;
    private publish;
    private save;
}
//# sourceMappingURL=git-sync-card.d.ts.map