/**
 * Standalone verification for the GitHub URL parsing / auto-create module
 * (no network). Run from the repo root:
 *   node --import tsx/esm packages/experimental/git-sync/tests/github.verify.ts
 */
import { parseGitHubRepo } from '../src/github.ts'

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(`ASSERT FAILED: ${msg}`)
}

const cases: Array<[string, { owner: string; name: string } | undefined]> = [
  ['git@github.com:alice/dsh-sync.git', { owner: 'alice', name: 'dsh-sync' }],
  ['https://github.com/alice/dsh-sync.git', { owner: 'alice', name: 'dsh-sync' }],
  ['https://github.com/alice/dsh-sync', { owner: 'alice', name: 'dsh-sync' }],
  ['git@github.com:org-team/with.dots.git', { owner: 'org-team', name: 'with.dots' }],
  ['https://gitlab.com/alice/repo.git', undefined],
  ['not-a-url', undefined],
  ['', undefined],
]

for (const [url, expected] of cases) {
  const got = parseGitHubRepo(url)
  assert(JSON.stringify(got) === JSON.stringify(expected), `${JSON.stringify(url)} -> ${JSON.stringify(got)}, want ${JSON.stringify(expected)}`)
}

console.log('========================================')
console.log('github parse verification: PASSED')
console.log(`  ${cases.length} URL shapes parsed correctly`)
