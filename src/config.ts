/**
 * dsh-git-sync host config. The `config:` block of the plugin's loader row is
 * validated against this schemastery schema before `apply` runs; every
 * deployment-varying value is a field here (no hardcoded tunables).
 * @module @deepseek-ai/dsh-git-sync/config
 */

import z from '@deepseek-ai/schemastery'
import { dshHomePath } from '@deepseek-ai/dsh-home-paths'

/**
 * Config surface for the global toggle and the git remote. `enabled` defaults
 * to `false`: nothing syncs until the user opts a session in AND turns this on.
 */
export interface Config {
  /** Master switch. Defaults to off — sync is strictly opt-in per session. */
  enabled: boolean
  /** The git remote URL (SSH or HTTPS) that holds the shared mirror. */
  remoteUrl: string
  /** Branch to track. Defaults to `main`. */
  branch: string
  /** Periodic sync interval in minutes; `0` disables the timer (manual only). */
  intervalMinutes: number
  /** The mirror directory. Defaults to `<dsh home>/git-sync`. */
  syncDir: string
  /** Git author identity for mirror commits. */
  authorName: string
  /** Git author email for mirror commits. */
  authorEmail: string
  /** Opt-in: use a `GITHUB_TOKEN`/configured token to create the repo if absent. */
  autoCreateRepo: boolean
  /** Whether an auto-created repo is private (session data is private by default). */
  repoPrivate: boolean
  /** Env var (or DSH credential ref) holding a GitHub PAT for auto-create. */
  apiTokenEnv: string
}

export const Config: z<Config> = z.object({
  enabled: z.boolean().default(false),
  remoteUrl: z.string().default(''),
  branch: z.string().default('main'),
  intervalMinutes: z.number().step(1).min(0).default(10),
  syncDir: z.string().default(dshHomePath('git-sync')),
  authorName: z.string().default('dsh-git-sync'),
  authorEmail: z.string().default('dsh-git-sync@localhost'),
  autoCreateRepo: z.boolean().default(false),
  repoPrivate: z.boolean().default(true),
  apiTokenEnv: z.string().default('GITHUB_TOKEN'),
})

/** Whether periodic sync is armed with the resolved interval. */
export function periodicMs(config: Config): number {
  return config.intervalMinutes > 0 ? config.intervalMinutes * 60_000 : 0
}

/**
 * Resolve a loader-provided config (possibly partial — a patch row restates
 * only the keys it owns) into a fully-defaulted {@link Config}. Schemastery
 * validates and documents the defaults; this applies them at runtime, matching
 * the `??` pattern the goal service uses for its own config.
 */
export function resolveConfig(config?: Partial<Config>): Config {
  return {
    enabled: config?.enabled ?? false,
    remoteUrl: config?.remoteUrl ?? '',
    branch: config?.branch ?? 'main',
    intervalMinutes: config?.intervalMinutes ?? 10,
    syncDir: config?.syncDir ?? dshHomePath('git-sync'),
    authorName: config?.authorName ?? 'dsh-git-sync',
    authorEmail: config?.authorEmail ?? 'dsh-git-sync@localhost',
    autoCreateRepo: config?.autoCreateRepo ?? false,
    repoPrivate: config?.repoPrivate ?? true,
    apiTokenEnv: config?.apiTokenEnv ?? 'GITHUB_TOKEN',
  }
}

export default Config
