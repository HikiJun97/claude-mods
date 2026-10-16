import type { On } from 'claude-code'
import { expect, test } from 'claude-code/testing'

const WT = '/r/laighthouse-web/.claude/worktrees/bright-discovering-plum'

// Answers git as a repo would, and records each status line the plugin pins.
function fakeGit(on: On, answers: Record<string, string>) {
  const pinned: (string | undefined)[] = []
  on('process.run', async (_$, e) => {
    const stdout = answers[e.argv.slice(1).join(' ')]
    return { value: { exitCode: stdout === undefined ? 128 : 0, stdout: `${stdout ?? ''}\n`, stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }
  })
  on('ui.status', async (_$, e) => {
    pinned.push(e.text)
    return { value: undefined }
  })
  return pinned
}

const PATHS = 'rev-parse --path-format=absolute --show-toplevel --git-dir --git-common-dir'

test('shows the branch and the worktree folder in a linked worktree', async ($, on) => {
  const pinned = fakeGit(on, {
    [PATHS]: `${WT}\n/r/laighthouse-web/.git/worktrees/bright-discovering-plum\n/r/laighthouse-web/.git`,
    'branch --show-current': 'fix/org-tree',
  })
  on('session.start', async (_$, e) => ({ cwd: e.cwd }))

  await $.session.start({ cwd: WT, surface: 'terminal', isInteractive: true })

  expect(pinned).toEqual(['⎇ fix/org-tree  ·  laighthouse-web › bright-discovering-plum'])
})

test('shows only the repo in the main checkout, and the commit when detached', async ($, on) => {
  const pinned = fakeGit(on, {
    [PATHS]: '/r/laighthouse-web\n/r/laighthouse-web/.git\n/r/laighthouse-web/.git',
    'branch --show-current': '',
    'rev-parse --short HEAD': 'f456ef2',
  })
  on('session.start', async (_$, e) => ({ cwd: e.cwd }))

  await $.session.start({ cwd: '/r/laighthouse-web', surface: 'terminal', isInteractive: true })

  expect(pinned).toEqual(['⎇ detached f456ef2  ·  laighthouse-web'])
})

test('clears the line outside a git repo', async ($, on) => {
  const pinned = fakeGit(on, {})
  on('session.start', async (_$, e) => ({ cwd: e.cwd }))

  await $.session.start({ cwd: '/tmp', surface: 'terminal', isInteractive: true })

  expect(pinned).toEqual([undefined])
})
