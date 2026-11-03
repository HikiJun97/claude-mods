import type { On, SessionUsage } from 'claude-code'
import { expect, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'

const WT = '/r/laighthouse-web/.claude/worktrees/bright-discovering-plum'
const TOP = 'rev-parse --show-toplevel'
const IDLE: SessionUsage = { startedAt: 0, context: { window: 1_000_000 }, rateLimits: [] }

// Answers git as a repo would, the session's usage as given, and draws the
// footer as the engine would: the hint with its tail, the modes joined.
function fakeEngine(on: On, answers: Record<string, string>, usage: SessionUsage = IDLE) {
  on('process.run', async (_$, e) => {
    const stdout = answers[e.argv.slice(1).join(' ')]
    return { value: { exitCode: stdout === undefined ? 128 : 0, stdout: `${stdout ?? ''}\n`, stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }
  })
  on('session.usage', async () => ({ value: usage }))
  on('session.start', async (_$, e) => ({ cwd: e.cwd }))
  on('session.measure', async (_$, e) => ({ changed: e.changed }))
  on('ui.render', async ($, e) => {
    const { Text } = $.ui.resolve(e)
    if (e.component === 'PromptHint') return <Text>{`${e.props.hint}${e.props.tail ?? ''}`}</Text>
    if (e.component === 'SessionMode') return <Text>{e.props.modes.join(' & ')}</Text>
    return <Text />
  })
}

async function footer($: Engine) {
  const hint = await $.ui.mount({ plugin: 'where-am-i', surface: 'terminal', component: 'PromptHint', props: { isDraft: false, isWorking: false, hint: '? for shortcuts' } })
  const modes = await $.ui.mount({ plugin: 'where-am-i', surface: 'terminal', component: 'SessionMode', props: { modes: [] } })
  const drawn = { left: (await hint.find({ type: 'Text' }))?.text, right: (await modes.find({ type: 'Text' }))?.text }
  await hint.unmount()
  await modes.unmount()
  return drawn
}

test('shows the branch and the absolute worktree path in a linked worktree', async ($, on) => {
  fakeEngine(on, { [TOP]: WT, 'branch --show-current': 'fix/org-tree' })

  await $.session.start({ cwd: WT, surface: 'terminal', isInteractive: true })

  expect((await footer($)).left).toBe(`? for shortcuts   fix/org-tree  ·  ${WT}`)
})

test('shows the absolute repo path in the main checkout, and the commit when detached', async ($, on) => {
  fakeEngine(on, { [TOP]: '/r/laighthouse-web', 'branch --show-current': '', 'rev-parse --short HEAD': 'f456ef2' })

  await $.session.start({ cwd: '/r/laighthouse-web', surface: 'terminal', isInteractive: true })

  expect((await footer($)).left).toBe('? for shortcuts   detached f456ef2  ·  /r/laighthouse-web')
})

test('leaves the hint alone outside a git repo', async ($, on) => {
  fakeEngine(on, {})

  await $.session.start({ cwd: '/tmp', surface: 'terminal', isInteractive: true })

  expect((await footer($)).left).toBe('? for shortcuts')
})

test('shows the context fill at the right end once a response reports it', async ($, on) => {
  fakeEngine(on, {})

  await $.session.start({ cwd: '/tmp', surface: 'terminal', isInteractive: true })
  expect((await footer($)).right).toBe('')

  await $.session.measure({ context: { tokens: 570_123, window: 1_000_000, percent: 57 }, rateLimits: [], changed: ['context'] })
  expect((await footer($)).right).toBe('57% (570.1k / 1M)')
})

test('reads the fill the session already has when it starts', async ($, on) => {
  fakeEngine(on, {}, { ...IDLE, context: { tokens: 12_000, window: 200_000, percent: 6 } })

  await $.session.start({ cwd: '/tmp', surface: 'terminal', isInteractive: true })

  expect((await footer($)).right).toBe('6% (12k / 200k)')
})
