/**
 * The dsh-git-sync service: owns the mirror engine and the per-session opt-in
 * manifest, and coordinates with `ctx.sessionPersistence` to mirror enabled
 * session artifacts and write pulled changes back to the local store.
 * @module @deepseek-ai/dsh-git-sync/service
 */
import { Context, Service } from '@deepseek-ai/cordis';
import type { SessionHeader, SessionId } from '@deepseek-ai/dsh-session';
import type { Config } from './config.ts';
import { GitSyncEngine } from './engine.ts';
import type { SettingsAccess } from './settings.ts';
/** A single manifest entry: whether a session is opted in, plus its header. */
export interface ManifestEntry {
    enabled: boolean;
    header?: SessionHeader;
}
/** Resolved prompt-shaped manifest stored in the mirror. */
export interface Manifest {
    version: number;
    note: string;
    enabled: boolean;
    sessions: Record<string, ManifestEntry>;
}
export interface SyncStatus {
    readonly ok: boolean;
    readonly pushed: boolean;
    readonly updated: readonly string[];
    readonly conflict: boolean;
    readonly message: string;
}
/**
 * The `ctx.gitSync` service. Created once per plugin instance; reads and writes
 * the mirror manifest through the {@link GitSyncEngine}.
 */
export declare class GitSync extends Service {
    static inject: string[];
    readonly engine: GitSyncEngine;
    private config;
    private settingsAccess;
    private settingsWatchDispose;
    constructor(ctx: Context, config: Config);
    /** Attach the settings read/write handle (registered by the plugin entry). */
    setSettingsAccess(access: SettingsAccess | undefined): void;
    /**
     * Open the GitHub browser login (Git Credential Manager). Runs detached so the
     * host never blocks; the credential lands in the OS store and the status is
     * refreshed when GCM exits.
     */
    private runGitHubLogin;
    /** Check whether a GitHub credential is stored, and publish the result. */
    private refreshAuthStatus;
    private checkGitHubAuth;
    /**
     * The effective config: the cordis `config:` block as the base, with the user
     * settings layer (when a settings provider is composed) winning for the
     * editable fields. Reads the settings live, so a settings-card edit applies
     * without restart.
     */
    effectiveConfig(): Config;
    /** The effective periodic interval in milliseconds; 0 disables the timer. */
    intervalMs(): number;
    /** The master switch value (settings, then config; manifest is legacy). */
    isEnabled(): Promise<boolean>;
    /** Flip the master switch: persist into settings when available, else manifest. */
    setEnabled(enabled: boolean): Promise<void>;
    /** Opt a session in (true) or out (false) of the mirror. */
    setSessionSync(id: SessionId, enabled: boolean, header?: SessionHeader): Promise<void>;
    /** Whether a specific session is opted into sync. */
    isSessionSynced(id: SessionId): Promise<boolean>;
    /** The ids of every session opted into sync, regardless of local presence. */
    listEnabled(): Promise<SessionId[]>;
    /** Upload locally-enabled sessions, then pull and apply remote changes. */
    syncNow(): Promise<SyncStatus>;
    /** The manifest as currently stored (for diagnostics). */
    loadManifest(): Promise<Manifest>;
    private applyRemote;
}
//# sourceMappingURL=service.d.ts.map