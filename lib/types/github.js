/**
 * GitHub remote creation for dsh-git-sync auto-create.
 *
 * Kept dependency-free so the reachability/creation logic is testable in
 * isolation: `parseGitHubRepo` derives `owner`/`name` from the common SSH and
 * HTTPS spellings, and `ensureRepoExists` checks then creates the repo through
 * the GitHub REST API using the configured token.
 * @module @deepseek-ai/dsh-git-sync/github
 */
import { spawn } from 'node:child_process';
const API_ROOT = 'https://api.github.com';
/** Derive `{ owner, name }` from a GitHub SSH/HTTPS remote URL. */
export function parseGitHubRepo(remoteUrl) {
    const trimmed = remoteUrl.trim();
    // https://github.com/owner/repo(.git)? | git@github.com:owner/repo(.git)?
    const match = trimmed.match(/github\.com[/:]([^/]+)\/([^/]+?)(?:\.git)?\/?$/);
    if (match === null)
        return undefined;
    const owner = match[1];
    const name = match[2];
    if (owner === undefined || name === undefined || owner === '' || name === '')
        return undefined;
    return { owner, name };
}
function headers(token) {
    return {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'dsh-git-sync',
        'Content-Type': 'application/json',
    };
}
/** Whether the GitHub repo exists under the authenticated token. */
export async function repoExists(token, owner, name) {
    const res = await fetch(`${API_ROOT}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`, {
        headers: headers(token),
    });
    if (res.status === 200)
        return true;
    if (res.status === 404)
        return false;
    throw new Error(`GitHub repo check failed (${res.status}): ${await res.text()}`);
}
/** Create a private (or public) GitHub repo under the authenticated account. */
export async function createGitHubRepo(token, name, repoPrivate) {
    const res = await fetch(`${API_ROOT}/user/repos`, {
        method: 'POST',
        headers: headers(token),
        body: JSON.stringify({ name, private: repoPrivate }),
    });
    if (res.status !== 201) {
        throw new Error(`GitHub repo create failed (${res.status}): ${await res.text()}`);
    }
}
/**
 * Read the token named by `config.apiTokenEnv` from the environment, falling
 * back to the token Git Credential Manager already stored for github.com (the
 * "Sign in with GitHub" card action) — so auto-create works with just the
 * browser login, no separate PAT required.
 */
export async function tokenFor(config, env = process.env) {
    const fromEnv = env[config.apiTokenEnv]?.trim();
    if (fromEnv !== undefined && fromEnv !== '')
        return fromEnv;
    return await storedGitHubToken();
}
/** Read the stored github.com credential (GCM) and return its token. */
function storedGitHubToken() {
    return new Promise(resolve => {
        const child = spawn('git', ['credential', 'fill'], {
            env: { ...process.env, GIT_TERMINAL_PROMPT: '0', GCM_INTERACTIVE: 'Never' },
            windowsHide: true,
        });
        let stdout = '';
        let settled = false;
        const finish = (token) => {
            if (settled)
                return;
            settled = true;
            clearTimeout(timer);
            resolve(token);
        };
        const timer = setTimeout(() => {
            child.kill();
            finish(undefined);
        }, 10_000);
        child.stdout.on('data', (chunk) => { stdout += chunk.toString('utf8'); });
        child.on('error', () => { finish(undefined); });
        child.on('close', () => {
            const match = stdout.match(/^password=(.+)$/m);
            finish(match?.[1]);
        });
        child.stdin.on('error', () => { finish(undefined); });
        child.stdin.write('protocol=https\nhost=github.com\n\n');
        child.stdin.end();
    });
}
/**
 * Ensure the configured GitHub remote exists, creating it when
 * `config.autoCreateRepo` is set and a token is available. Returns `skipped`
 * when the URL is not GitHub-shaped or no token is present — the subsequent
 * git push then reports the actual failure.
 */
export async function ensureRepoExists(config, env = process.env) {
    const parsed = parseGitHubRepo(config.remoteUrl);
    if (parsed === undefined)
        return 'skipped';
    const token = await tokenFor(config, env);
    if (token === undefined)
        return 'skipped';
    if (await repoExists(token, parsed.owner, parsed.name))
        return 'exists';
    await createGitHubRepo(token, parsed.name, config.repoPrivate);
    return 'created';
}
//# sourceMappingURL=github.js.map