import type { EngineInterface, Register } from 'claude-code'

async function git($: EngineInterface, args: string[]): Promise<string | undefined> {
  const { exitCode, stdout } = await $.process.run(['git', ...args])
  return exitCode === 0 ? stdout.trim() : undefined
}

// "⎇ <branch>  ·  <repo>" in the main checkout, "⎇ <branch>  ·  <repo> › <worktree>" in a linked worktree.
export async function locate($: EngineInterface): Promise<string | undefined> {
  const paths = await git($, ['rev-parse', '--path-format=absolute', '--show-toplevel', '--git-dir', '--git-common-dir'])
  if (paths === undefined) return undefined

  const [top = '', gitDir, commonDir = ''] = paths.split('\n')
  const repo = commonDir.replace(/\/\.git\/?$/, '').split('/').pop()
  const folder = top.split('/').pop()
  const place = gitDir === commonDir ? repo : `${repo} › ${folder}`
  const branch = (await git($, ['branch', '--show-current'])) || `detached ${await git($, ['rev-parse', '--short', 'HEAD'])}`

  return `⎇ ${branch}  ·  ${place}`
}

async function refresh($: EngineInterface): Promise<void> {
  $.ui.status(await locate($))
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const started = await next(e)
    await refresh($)
    return started
  })

  // A Bash call may check out another branch.
  on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
    const ran = await next(e)
    await refresh($)
    return ran
  }).catch(($, e, next) => next(e)) // a failed refresh never blocks the command

  // Catches what changed outside a tool call, such as a `!` command or another terminal.
  on('turn.complete', async ($, e, next) => {
    const done = await next(e)
    if (e.agentId === undefined) await refresh($)
    return done
  })
}
