/**
 * dsh-git-sync host config. The `config:` block of the plugin's loader row is
 * validated against this schemastery schema before `apply` runs; every
 * deployment-varying value is a field here (no hardcoded tunables).
 * @module @deepseek-ai/dsh-git-sync/config
 */
import z from '@deepseek-ai/schemastery';
/**
 * Config surface for the global toggle and the git remote. `enabled` defaults
 * to `false`: nothing syncs until the user opts a session in AND turns this on.
 */
export interface Config {
    /** Master switch. Defaults to off — sync is strictly opt-in per session. */
    enabled: boolean;
    /** The git remote URL (SSH or HTTPS) that holds the shared mirror. */
    remoteUrl: string;
    /** Branch to track. Defaults to `main`. */
    branch: string;
    /** Periodic sync interval in minutes; `0` disables the timer (manual only). */
    intervalMinutes: number;
    /** The mirror directory. Defaults to `<dsh home>/git-sync`. */
    syncDir: string;
    /** Git author identity for mirror commits. */
    authorName: string;
    /** Git author email for mirror commits. */
    authorEmail: string;
    /** Opt-in: use a `GITHUB_TOKEN`/configured token to create the repo if absent. */
    autoCreateRepo: boolean;
    /** Whether an auto-created repo is private (session data is private by default). */
    repoPrivate: boolean;
    /** Env var (or DSH credential ref) holding a GitHub PAT for auto-create. */
    apiTokenEnv: string;
}
export declare const Config: z<Config>;
/** Whether periodic sync is armed with the resolved interval. */
export declare function periodicMs(config: Config): number;
/**
 * Resolve a loader-provided config (possibly partial — a patch row restates
 * only the keys it owns) into a fully-defaulted {@link Config}. Schemastery
 * validates and documents the defaults; this applies them at runtime, matching
 * the `??` pattern the goal service uses for its own config.
 */
export declare function resolveConfig(config?: Partial<Config>): Config;
export default Config;
//# sourceMappingURL=config.d.ts.map