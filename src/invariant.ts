/**
 * Package-owned dsh-git-sync invariant: every session that is opted into sync
 * must have its artifact present in the mirror (manifest → mirror ownership).
 * @module @deepseek-ai/dsh-git-sync/invariant
 */

import type { Context } from '@deepseek-ai/cordis'
import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import type { InvariantFailure, InvariantInstaller } from '@deepseek-ai/dsh-invariants'

const PACKAGE_NAME = '@deepseek-ai/dsh-git-sync'

/** Cordis invariant-companion plugin name. */
export const name = 'git-sync-invariant'
/** Services required before reserving this package's invariant ownership. */
export const inject = ['invariants', 'gitSync']

/** Validate that each enabled session has a mirror artifact on disk. */
function validate(ctx: Context, fail: InvariantFailure): void {
  void ctx.gitSync.loadManifest().then(manifest => {
    for (const [id, entry] of Object.entries(manifest.sessions)) {
      if (!entry.enabled) continue
      const dir = join(ctx.gitSync.engine.syncDir, 'sessions', id)
      const present = existsSync(dir) && readdirHasSessionFile(dir)
      if (!present) fail(`enabled session ${id} is missing its mirror artifact`)
    }
  })
}

function readdirHasSessionFile(dir: string): boolean {
  try {
    return readdirSync(dir).some(entry => entry.startsWith('session.'))
  } catch {
    return false
  }
}

/* jscpd:ignore-start -- package companions share replay and dispatch plumbing */
const install: InvariantInstaller = Object.assign((ctx: Context, fail: InvariantFailure) => {
  ctx.on('session/created', () => {
    validate(ctx, fail)
  }, { global: true })
  validate(ctx, fail)
}, { inject: ['gitSync'] })
/* jscpd:ignore-end */

/**
 * Register the package-owned invariant companion.
 * @param ctx - Cordis context carrying the invariant registry.
 * @returns Exact registration disposer after child setup succeeds.
 */
export const apply = (ctx: Context): Promise<() => void> =>
  Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install))
