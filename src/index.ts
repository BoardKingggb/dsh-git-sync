/**
 * dsh-git-sync: per-session opt-in multi-device sync of session/memory data
 * over git. Nothing syncs until the user opts a session in AND turns the master
 * switch on. Conflicts resolve by keeping the local copy (last-write-wins).
 * @module @deepseek-ai/dsh-git-sync
 */

import type { Context } from '@deepseek-ai/cordis'
import type { CommandResult } from '@deepseek-ai/dsh-commands'
import type { SessionId } from '@deepseek-ai/dsh-session'
import { GitSync } from './service.ts'
import { resolveConfig, type Config as ConfigShape } from './config.ts'
import { installGitSyncSettings } from './settings.ts'

declare module '@deepseek-ai/cordis' {
  interface Context {
    gitSync: GitSync
  }
}

export { Config } from './config.ts'
export { GitSync } from './service.ts'
export { GitSyncEngine, type SessionSnapshot } from './engine.ts'

/** Cordis function-plugin name. */
export const name = 'git-sync'
/** Services required before the sync service and command can run. */
export const inject = ['sessionPersistence', 'commands']

/** Build a human-readable status line from a sync cycle. */
function statusLine(status: { pushed: boolean; updated: readonly string[]; conflict: boolean; message: string }): string {
  const parts: string[] = []
  parts.push(status.pushed ? 'pushed ✓' : 'no local changes')
  parts.push(`${status.updated.length} pulled`)
  if (status.conflict) parts.push('conflict: kept local ⚠')
  return `${parts.join(' · ')} — ${status.message}`
}

/** Run a sync and render the outcome for the calling channel. */
async function runSync(service: GitSync): Promise<CommandResult> {
  try {
    const status = await service.syncNow()
    return { kind: 'success', text: statusLine(status) }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    return { kind: 'error', text: `sync failed: ${message}` }
  }
}

/**
 * Install the sync service, the `/sync` command, and the periodic timer.
 * @param ctx - Cordis context.
 * @param config - validated plugin config (loader has already applied defaults).
 */
export function apply(ctx: Context, config: ConfigShape): void {
  const resolved = resolveConfig(config)
  const service = new GitSync(ctx, resolved)

  // Surface the editable config card (Settings → Plugins → Plugin configuration)
  // and hand the read/write handle to the service so settings edits apply live.
  installGitSyncSettings(ctx, access => { service.setSettingsAccess(access) })

  // Register directly on `ctx.commands` (not inside ctx.effect) so the injected
  // `commands` service is reachable on this plugin's fiber, matching command-goal.
  const dispose = ctx.commands.register({
    name: 'sync',
    description: 'sync enabled sessions with the shared git remote',
    input: { hint: '[on|off|enable [session]|disable [session]|list]' },
    handler: async invocation => {
      const input = (invocation.rawInput ?? '').trim()
      const [arg0, arg1] = input.split(/\s+/)
      switch (arg0) {
        case 'on':
          await service.setEnabled(true)
          return { kind: 'success', text: 'sync enabled. Opt sessions in, then /sync.' }
        case 'off':
          await service.setEnabled(false)
          return { kind: 'success', text: 'sync disabled.' }
        case 'enable': {
          // No id given: enable the CURRENT session (the one this command runs in).
          const id = (arg1 ?? invocation.agent.session.id) as SessionId
          const header = (await ctx.sessionPersistence.list()).find(h => h.id === id)
          await service.setSessionSync(id, true, header)
          return { kind: 'success', text: `session ${id} opted into sync.` }
        }
        case 'disable': {
          const id = (arg1 ?? invocation.agent.session.id) as SessionId
          await service.setSessionSync(id, false)
          return { kind: 'success', text: `session ${id} removed from sync.` }
        }
        case 'list': {
          const headers = await ctx.sessionPersistence.list()
          const lines: string[] = []
          for (const header of headers) {
            const on = await service.isSessionSynced(header.id)
            lines.push(`${on ? '✓' : '·'} ${header.id}${on ? '  (syncing)' : ''}`)
          }
          return {
            kind: 'success',
            text: lines.length > 0 ? lines.join('\n') : 'no sessions found',
          }
        }
        case '':
        case 'now':
          return await runSync(service)
        default:
          return { kind: 'error', text: 'usage: /sync [on|off|enable [session]|disable [session]|list]' }
      }
    },
  })

  // Periodic sync: a recursive timeout re-reads the effective interval every
  // cycle, so a settings-card interval change applies without a restart.
  let timer: ReturnType<typeof setTimeout> | undefined
  let stopped = false
  const scheduleNext = (): void => {
    const ms = service.intervalMs()
    if (ms <= 0 || stopped) return
    timer = setTimeout(() => {
      void service.syncNow().catch(error => {
        // A background sync failure is informational; never crash the host.
        console.error(`[dsh-git-sync] periodic sync failed: ${error instanceof Error ? error.message : String(error)}`)
      }).finally(() => scheduleNext())
    }, ms)
    timer.unref?.()
  }
  scheduleNext()

  ctx.effect(() => () => {
    stopped = true
    if (timer !== undefined) clearTimeout(timer)
    dispose()
  }, 'git-sync: command + periodic timer')
}
