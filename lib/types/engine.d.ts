/**
 * Dependency-light git sync engine for dsh-git-sync.
 *
 * The engine only knows how to keep a mirror directory under a git remote: it
 * initializes a repo, copies enabled session artifacts in, commits, pushes, and
 * pulls (rebasing). It has zero DSH dependencies so it can be unit-tested in
 * isolation and reused by a standalone runner as well as the Cordis host.
 *
 * Conflict policy (v1): on a rebase conflict the engine keeps the LOCAL state
 * of a file and reports the conflict; the caller decides what to surface.
 * @module @deepseek-ai/dsh-git-sync/engine
 */
/** A local session artifact to mirror. The engine treats the bytes as opaque. */
export interface SessionSnapshot {
    /** Stable, device-independent session id (SessionId branded string). */
    id: string;
    /** Absolute path to the on-disk session log file on THIS device. */
    contentPath: string;
}
/** Returned by a pull when a rebase conflict decided to keep local files. */
export interface SyncConflict {
    readonly sessionIds: readonly string[];
}
export interface PullResult {
    /** Session ids whose mirror artifacts changed because of this pull. */
    readonly updated: readonly string[];
    readonly conflict: SyncConflict | undefined;
    readonly message: string;
}
export interface PushResult {
    readonly committed: boolean;
    readonly commitHash: string | undefined;
    readonly pushed: boolean;
    readonly message: string;
}
export interface EngineOptions {
    /** The mirror directory that is also the git working tree. */
    readonly syncDir: string;
    /** The git remote URL (SSH or HTTPS). */
    readonly remoteUrl: string;
    /** The branch to track; defaults to `main`. */
    readonly branch?: string;
    readonly authorName?: string;
    readonly authorEmail?: string;
}
/**
 * A small, dependency-free git wrapper over a mirror directory.
 *
 * Mirror layout:
 * ```
 * <syncDir>/
 *   .git/
 *   sessions/<id>/<basename of the source artifact>
 *   manifest.json
 *   README.md
 * ```
 * Sessions are keyed by id (never by cwd), so a session authored on one device
 * maps to the same mirror path on every device even when their cwd slugs differ.
 */
export declare class GitSyncEngine {
    readonly syncDir: string;
    /** The git remote URL. Mutable: `ensureRepo()` re-pins the remote every call, so a settings change takes effect on the next sync. */
    remoteUrl: string;
    /** The branch to track. Mutable for the same reason as {@link remoteUrl}. */
    branch: string;
    private readonly authorName;
    private readonly authorEmail;
    constructor(options: EngineOptions);
    /** Ensure the mirror is a git repo with a remote and a tracked baseline. */
    ensureRepo(): Promise<void>;
    /** Copy the given session artifacts into the mirror and (if dirty) commit + push. */
    pushSessions(snapshots: readonly SessionSnapshot[]): Promise<PushResult>;
    /** Pull the remote, rebasing local commits; on conflict keep local files. */
    pull(): Promise<PullResult>;
    /** Commit the manifest file alone, so opt-in changes survive any re-init. */
    commitManifest(): Promise<void>;
    /** Read the session id → header map maintained in the mirror. */
    readManifest(): Promise<unknown>;
    writeManifest(manifest: unknown): Promise<void>;
    /** The absolute mirror path for a session artifact, preserving the artifact name. */
    mirrorPath(id: string, contentPath: string): string;
    private installScaffold;
    private writeManifestBaseline;
    /** Remove mirror entries whose id is no longer in the enabled set. */
    private pruneMissingMirrors;
    private commitAll;
    private push;
    private hasChanges;
    private head;
    private changedSessionIds;
    private commitMessage;
    private fileExists;
    private git;
}
/** Convenience export the plugin/service uses for the default manifest shape. */
export declare function createManifest(): Record<string, unknown>;
/** Generate a unique marker for a pending write (not currently used by the engine). */
export declare function pendingMarker(): string;
//# sourceMappingURL=engine.d.ts.map