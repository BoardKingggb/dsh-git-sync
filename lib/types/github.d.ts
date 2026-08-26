/**
 * GitHub remote creation for dsh-git-sync auto-create.
 *
 * Kept dependency-free so the reachability/creation logic is testable in
 * isolation: `parseGitHubRepo` derives `owner`/`name` from the common SSH and
 * HTTPS spellings, and `ensureRepoExists` checks then creates the repo through
 * the GitHub REST API using the configured token.
 * @module @deepseek-ai/dsh-git-sync/github
 */
import type { Config } from './config.ts';
export interface GitHubRepo {
    readonly owner: string;
    readonly name: string;
}
/** Derive `{ owner, name }` from a GitHub SSH/HTTPS remote URL. */
export declare function parseGitHubRepo(remoteUrl: string): GitHubRepo | undefined;
/** Whether the GitHub repo exists under the authenticated token. */
export declare function repoExists(token: string, owner: string, name: string): Promise<boolean>;
/** Create a private (or public) GitHub repo under the authenticated account. */
export declare function createGitHubRepo(token: string, name: string, repoPrivate: boolean): Promise<void>;
/**
 * Read the token named by `config.apiTokenEnv` from the environment, falling
 * back to the token Git Credential Manager already stored for github.com (the
 * "Sign in with GitHub" card action) — so auto-create works with just the
 * browser login, no separate PAT required.
 */
export declare function tokenFor(config: Config, env?: NodeJS.ProcessEnv): Promise<string | undefined>;
export type RepoEnsure = 'exists' | 'created' | 'skipped';
/**
 * Ensure the configured GitHub remote exists, creating it when
 * `config.autoCreateRepo` is set and a token is available. Returns `skipped`
 * when the URL is not GitHub-shaped or no token is present — the subsequent
 * git push then reports the actual failure.
 */
export declare function ensureRepoExists(config: Config, env?: NodeJS.ProcessEnv): Promise<RepoEnsure>;
//# sourceMappingURL=github.d.ts.map