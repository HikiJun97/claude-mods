import type { EngineInterface, Register } from 'claude-code'

async function git($: EngineInterface, args: string[]): Promise<string | undefined> {
  const { exitCode, stdout } = await $.process.run(['git', ...args])
  return exitCode === 0 ? stdout.trim() : undefined
}

// "<git icon> <branch>  ·  <absolute path of the checkout>", for the main checkout and a linked worktree alike.
// The icon is the Nerd Font git logo (nf-dev-git), so the terminal font must be a Nerd Font.
export async function locate($: EngineInterface): Promise<string | undefined> {
  const place = await git($, ['rev-parse', '--show-toplevel'])
  if (place === undefined) return undefined

  const branch = (await git($, ['branch', '--show-current'])) || `detached ${await git($, ['rev-parse', '--short', 'HEAD'])}`

  return ` ${branch}  ·  ${place}`
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
