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

const TOP = 'rev-parse --show-toplevel'

test('shows the branch and the absolute worktree path in a linked worktree', async ($, on) => {
  const pinned = fakeGit(on, {
    [TOP]: WT,
    'branch --show-current': 'fix/org-tree',
  })
  on('session.start', async (_$, e) => ({ cwd: e.cwd }))

  await $.session.start({ cwd: WT, surface: 'terminal', isInteractive: true })

  expect(pinned).toEqual(['\ue702 fix/org-tree  ·  /r/laighthouse-web/.claude/worktrees/bright-discovering-plum'])
})

test('shows the absolute repo path in the main checkout, and the commit when detached', async ($, on) => {
  const pinned = fakeGit(on, {
    [TOP]: '/r/laighthouse-web',
    'branch --show-current': '',
    'rev-parse --short HEAD': 'f456ef2',
  })
  on('session.start', async (_$, e) => ({ cwd: e.cwd }))

  await $.session.start({ cwd: '/r/laighthouse-web', surface: 'terminal', isInteractive: true })

  expect(pinned).toEqual(['\ue702 detached f456ef2  ·  /r/laighthouse-web'])
})

test('clears the line outside a git repo', async ($, on) => {
  const pinned = fakeGit(on, {})
  on('session.start', async (_$, e) => ({ cwd: e.cwd }))

  await $.session.start({ cwd: '/tmp', surface: 'terminal', isInteractive: true })

  expect(pinned).toEqual([undefined])
})
