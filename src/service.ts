/**
 * The dsh-git-sync service: owns the mirror engine and the per-session opt-in
 * manifest, and coordinates with `ctx.sessionPersistence` to mirror enabled
 * session artifacts and write pulled changes back to the local store.
 * @module @deepseek-ai/dsh-git-sync/service
 */

import { spawn } from 'node:child_process'
import { Context, Service } from '@deepseek-ai/cordis'
import type { SessionHeader, SessionId } from '@deepseek-ai/dsh-session'
import type {} from '@deepseek-ai/dsh-session-persistence'
import type { Config } from './config.ts'
import { GitSyncEngine, type SessionSnapshot } from './engine.ts'
import { ensureRepoExists } from './github.ts'
import type { SettingsAccess } from './settings.ts'

/** A single manifest entry: whether a session is opted in, plus its header. */
export interface ManifestEntry {
  enabled: boolean
  header?: SessionHeader
}

/** Resolved prompt-shaped manifest stored in the mirror. */
export interface Manifest {
  version: number
  note: string
  enabled: boolean
  sessions: Record<string, ManifestEntry>
}

export interface SyncStatus {
  readonly ok: boolean
  readonly pushed: boolean
  readonly updated: readonly string[]
  readonly conflict: boolean
  readonly message: string
}

/**
 * The `ctx.gitSync` service. Created once per plugin instance; reads and writes
 * the mirror manifest through the {@link GitSyncEngine}.
 */
export class GitSync extends Service {
  static inject = ['sessionPersistence']

  readonly engine: GitSyncEngine
  private config: Config
  private settingsAccess: SettingsAccess | undefined
  private settingsWatchDispose: (() => void) | undefined

  constructor(ctx: Context, config: Config) {
    super(ctx, 'gitSync')
    this.config = config
    this.engine = new GitSyncEngine({
      syncDir: config.syncDir,
      remoteUrl: config.remoteUrl,
      branch: config.branch,
      authorName: config.authorName,
      authorEmail: config.authorEmail,
    })
  }

  /** Attach the settings read/write handle (registered by the plugin entry). */
  setSettingsAccess(access: SettingsAccess | undefined): void {
    this.settingsWatchDispose?.()
    this.settingsWatchDispose = undefined
    this.settingsAccess = access
    if (access !== undefined) {
      // The card bumps `loginRequest` to open the GitHub login, or `statusRequest`
      // to re-check the credential state; the host owns both actions.
      this.settingsWatchDispose = access.watch((next, prev) => {
        if (next.loginRequest !== prev.loginRequest) void this.runGitHubLogin()
        else if (next.statusRequest !== prev.statusRequest) void this.refreshAuthStatus()
      })
      void this.refreshAuthStatus()
    }
  }

  /**
   * Open the GitHub browser login (Git Credential Manager). Runs detached so the
   * host never blocks; the credential lands in the OS store and the status is
   * refreshed when GCM exits.
   */
  private runGitHubLogin(): void {
    void this.refreshAuthStatus('opening login…')
    try {
      const child = spawn('git', ['credential-manager', 'github', 'login'], {
        stdio: 'ignore',
        windowsHide: true,
        env: { ...process.env },
      })
      child.on('error', () => { void this.refreshAuthStatus() })
      child.on('exit', () => { void this.refreshAuthStatus() })
    } catch {
      void this.refreshAuthStatus()
    }
  }

  /** Check whether a GitHub credential is stored, and publish the result. */
  private async refreshAuthStatus(pending?: string): Promise<void> {
    const access = this.settingsAccess
    if (access === undefined) return
    if (pending !== undefined) {
      await access.update({ authStatus: pending }).catch(() => {})
      return
    }
    const status = await this.checkGitHubAuth()
    await access.update({ authStatus: status }).catch(() => {})
  }

  private checkGitHubAuth(): Promise<'unknown' | 'logged-in' | 'not-logged-in'> {
    return new Promise(resolve => {
      const child = spawn('git', ['credential', 'fill'], {
        env: { ...process.env, GIT_TERMINAL_PROMPT: '0', GCM_INTERACTIVE: 'Never' },
        windowsHide: true,
      })
      let stdout = ''
      let settled = false
      const finish = (status: 'unknown' | 'logged-in' | 'not-logged-in'): void => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        resolve(status)
      }
      const timer = setTimeout(() => {
        child.kill()
        finish('unknown')
      }, 15_000)
      child.stdout.on('data', (chunk: Buffer) => { stdout += chunk.toString('utf8') })
      child.on('error', () => { finish('unknown') })
      child.on('close', () => { finish(stdout.includes('password=') ? 'logged-in' : 'not-logged-in') })
      child.stdin.on('error', () => { finish('unknown') })
      child.stdin.write('protocol=https\nhost=github.com\n\n')
      child.stdin.end()
    })
  }

  /**
   * The effective config: the cordis `config:` block as the base, with the user
   * settings layer (when a settings provider is composed) winning for the
   * editable fields. Reads the settings live, so a settings-card edit applies
   * without restart.
   */
  effectiveConfig(): Config {
    return { ...this.config, ...(this.settingsAccess?.read() ?? {}) }
  }

  /** The effective periodic interval in milliseconds; 0 disables the timer. */
  intervalMs(): number {
    const minutes = this.effectiveConfig().intervalMinutes
    return minutes > 0 ? minutes * 60_000 : 0
  }

  /** The master switch value (settings, then config; manifest is legacy). */
  async isEnabled(): Promise<boolean> {
    return this.effectiveConfig().enabled
  }

  /** Flip the master switch: persist into settings when available, else manifest. */
  async setEnabled(enabled: boolean): Promise<void> {
    if (this.settingsAccess !== undefined) {
      await this.settingsAccess.update({ enabled })
      return
    }
    const manifest = await this.loadManifest()
    manifest.enabled = enabled
    await this.engine.writeManifest(manifest)
  }

  /** Opt a session in (true) or out (false) of the mirror. */
  async setSessionSync(id: SessionId, enabled: boolean, header?: SessionHeader): Promise<void> {
    const manifest = await this.loadManifest()
    manifest.sessions[id] = header === undefined ? { enabled } : { enabled, header }
    await this.engine.writeManifest(manifest)
    // Commit immediately so the opt-in survives a mirror re-init (the manifest
    // is the source of truth for which sessions are shared).
    try {
      await this.engine.commitManifest()
    } catch {
      // The mirror may not be initialized yet (first opt-in before any /sync);
      // the next sync commits it.
    }
  }

  /** Whether a specific session is opted into sync. */
  async isSessionSynced(id: SessionId): Promise<boolean> {
    const manifest = await this.loadManifest()
    return Boolean(manifest.sessions[id]?.enabled)
  }

  /** The ids of every session opted into sync, regardless of local presence. */
  async listEnabled(): Promise<SessionId[]> {
    const manifest = await this.loadManifest()
    return (Object.keys(manifest.sessions) as SessionId[]).filter(id => manifest.sessions[id]?.enabled)
  }

  /** Upload locally-enabled sessions, then pull and apply remote changes. */
  async syncNow(): Promise<SyncStatus> {
    const effective = this.effectiveConfig()
    if (!effective.enabled) {
      return { ok: true, pushed: false, updated: [], conflict: false, message: 'sync is disabled' }
    }
    if (effective.remoteUrl.trim() === '') {
      return { ok: true, pushed: false, updated: [], conflict: false, message: 'no remote configured' }
    }
    // A settings edit re-pins the remote and branch on the next cycle.
    this.engine.remoteUrl = effective.remoteUrl
    this.engine.branch = effective.branch
    await this.engine.ensureRepo()

    // Opt-in auto-create: create the GitHub repo before the first push when a
    // token is available. A missing token falls through so the push reports it.
    let created = false
    if (effective.autoCreateRepo) {
      const ensured = await ensureRepoExists(effective)
      created = ensured === 'created'
    }

    // --- push phase: mirror enabled sessions that exist on this device ---
    const enabled = new Set<SessionId>(await this.listEnabled())
    const snapshots: SessionSnapshot[] = []
    const headers = await this.ctx.sessionPersistence.list()
    const localHeader = new Map<SessionId, SessionHeader>()
    for (const header of headers) {
      localHeader.set(header.id, header)
      if (!enabled.has(header.id)) continue
      const loc = this.ctx.sessionPersistence.locate(header)
      if (loc?.kind === 'jsonl') snapshots.push({ id: header.id, contentPath: loc.path })
    }
    const push = await this.engine.pushSessions(snapshots)

    // --- pull phase: fetch remote changes, then write them home ---
    const pull = await this.engine.pull()
    const updated = pull.updated
    if (updated.length > 0) {
      await this.applyRemote(updated, localHeader)
    }

    return {
      ok: true,
      pushed: push.pushed,
      updated,
      conflict: pull.conflict !== undefined,
      message: [created ? 'repo created' : '', push.message, pull.message].filter(Boolean).join(' · '),
    }
  }

  /** The manifest as currently stored (for diagnostics). */
  async loadManifest(): Promise<Manifest> {
    const raw = await this.engine.readManifest()
    if (typeof raw === 'object' && raw !== null && 'sessions' in (raw as Record<string, unknown>)) {
      const parsed = raw as Partial<Manifest>
      return {
        version: parsed.version ?? 1,
        note: parsed.note ?? 'Managed by dsh-git-sync.',
        enabled: parsed.enabled ?? this.config.enabled,
        sessions: parsed.sessions ?? {},
      }
    }
    return { version: 1, note: 'Managed by dsh-git-sync.', enabled: this.config.enabled, sessions: {} }
  }

  private async applyRemote(
    updated: readonly string[],
    localHeader: ReadonlyMap<SessionId, SessionHeader>,
  ): Promise<void> {
    const manifest = await this.loadManifest()
    for (const id of updated as SessionId[]) {
      const header = localHeader.get(id) ?? manifest.sessions[id]?.header
      if (header === undefined) continue
      const loc = this.ctx.sessionPersistence.locate(header)
      if (loc?.kind !== 'jsonl') continue
      const mirror = this.engine.mirrorPath(id, loc.path)
      // Copy the pulled artifact back over the local file (last-write-wins).
      try {
        const { copyFile, mkdir } = await import('node:fs/promises')
        const { dirname } = await import('node:path')
        await mkdir(dirname(loc.path), { recursive: true })
        await copyFile(mirror, loc.path)
      } catch {
        // Best-effort: a failed write-back must not abort the sync cycle.
      }
    }
  }
}
