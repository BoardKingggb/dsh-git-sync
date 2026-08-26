/**
 * Standalone engine verification (not a vitest suite): exercises the engine
 * against a local bare remote to prove init / mirror / push / pull/rebase.
 * Run from the repo root:  node --import tsx/esm packages/experimental/git-sync/tests/engine.verify.ts
 */
import { execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, readFileSync, mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { GitSyncEngine } from '../src/engine.ts'

function git(cwd: string, args: string[]) {
  return execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8' })
}

function makeSessionFile(root: string, name: string, text: string): string {
  const dir = join(root, 'sessions-source', name)
  mkdirSync(dir, { recursive: true })
  const path = join(dir, 'session.jsonl.zstd')
  writeFileSync(path, text)
  return path
}

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(`ASSERT FAILED: ${msg}`)
}

async function main() {
  const base = mkdtempSync(join(tmpdir(), 'git-sync-verify-'))
  const remote = join(base, 'remote.git')
  execFileSync('git', ['init', '--bare', '-b', 'main', remote], { encoding: 'utf8' })

  const aMirror = join(base, 'deviceA', 'mirror')
  const aSource = join(base, 'deviceA', 'source')
  const bMirror = join(base, 'deviceB', 'mirror')

  // --- Device A: initialize and push session s1 ---
  const a = new GitSyncEngine({ syncDir: aMirror, remoteUrl: remote, branch: 'main', authorName: 'A', authorEmail: 'a@x' })
  await a.ensureRepo()
  const s1 = makeSessionFile(aSource, 's1', 'line1\n')
  const push1 = await a.pushSessions([{ id: 's1', contentPath: s1 }])
  assert(push1.pushed, `A initial push should succeed (got ${JSON.stringify(push1)})`)
  assert(git(remote, ['log', '--oneline']).trim().length > 0, 'remote should have A commits')

  // --- Device B: clone from the bare remote (B is already at the latest) ---
  execFileSync('git', ['clone', remote, bMirror], { encoding: 'utf8' })
  const b = new GitSyncEngine({ syncDir: bMirror, remoteUrl: remote, branch: 'main', authorName: 'B', authorEmail: 'b@x' })
  const pullB0 = await b.pull()
  const s1InB = join(bMirror, 'sessions', 's1', 'session.jsonl.zstd')
  assert(readFileSync(s1InB, 'utf8') === 'line1\n', 'B should already have A\'s s1 content from the clone')
  assert(pullB0.updated.length === 0, `freshly-cloned B pull should report no delta (got ${JSON.stringify(pullB0.updated)})`)

  // --- Device B: pass a DIFFERENT source session file (s1 again) to prove push path ---
  const bSource = join(base, 'deviceB', 'source')
  const s1Mod = makeSessionFile(bSource, 's1', 'line1\nline2\n')
  const s2 = makeSessionFile(bSource, 's2', 'B-s2\n')
  await b.pushSessions([{ id: 's1', contentPath: s1Mod }, { id: 's2', contentPath: s2 }])

  // --- Device A: pull B's changes; A is behind so it should see s1 and s2 ---
  const pullA = await a.pull()
  const aUpdated = pullA.updated
  assert(Array.isArray(aUpdated), `A pull.updated must be an array (got ${typeof aUpdated})`)
  assert(aUpdated.includes('s1'), `A pull should see s1 (got ${JSON.stringify(aUpdated)})`)
  assert(aUpdated.includes('s2'), `A pull should see s2 (got ${JSON.stringify(aUpdated)})`)
  const s1InA = join(aMirror, 'sessions', 's1', 'session.jsonl.zstd')
  assert(readFileSync(s1InA, 'utf8') === 'line1\nline2\n', 'A should have B\'s updated s1')
  const s2InA = join(aMirror, 'sessions', 's2', 'session.jsonl.zstd')
  assert(readFileSync(s2InA, 'utf8') === 'B-s2\n', 'A should have B\'s s2')

  // --- Conflict case: both A and B commit a change to the same mirror file ---
  const s3 = makeSessionFile(aSource, 's3', 'seed\n')
  await a.pushSessions([{ id: 's3', contentPath: s3 }])
  const bPullS3 = await b.pull()
  assert(bPullS3.updated.includes('s3'), `B pull should see s3 (got ${JSON.stringify(bPullS3.updated)})`)

  // A genuinely pushes a new version of s3 (A-s3-v2) to the remote.
  const s3A2 = makeSessionFile(aSource, 's3b', 'A-s3-v2\n')
  await a.pushSessions([{ id: 's3', contentPath: s3A2 }])

  // B commits its own divergent version of the same session and rebases on top
  // of A's newer commit -> a real conflict, which must keep B's local content.
  writeFileSync(join(bMirror, 'sessions', 's3', 'session.jsonl.zstd'), 'B-s3-v2\n')
  git(bMirror, ['add', '-A']); git(bMirror, ['commit', '-q', '-m', 'B s3 v2'])

  const conflictPull = await b.pull()
  assert(conflictPull.conflict !== undefined, 'B pull of a conflicting s3 should report a conflict')
  assert(readFileSync(join(bMirror, 'sessions', 's3', 'session.jsonl.zstd'), 'utf8') === 'B-s3-v2\n', 'conflict must keep LOCAL (B) content')

  console.log('========================================')
  console.log('git-sync engine verification: PASSED')
  console.log('  clean merge across devices: yes')
  console.log('  pull delta detection: yes')
  console.log('  conflict keep-local: yes')
  console.log('  base:', base)
  rmSync(base, { recursive: true, force: true })
}

main().catch(error => {
  console.error('========================================')
  console.error('git-sync engine verification: FAILED')
  console.error(error)
  process.exit(1)
})
