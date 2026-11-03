import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, SessionContextUsage } from 'claude-code'

const place = atom({ plugin: 'where-am-i', key: 'place' } as const, null)
const fill = atom({ plugin: 'where-am-i', key: 'fill' } as const, null)

async function git($: EngineInterface, args: string[]): Promise<string | undefined> {
  const { exitCode, stdout } = await $.process.run(['git', ...args])
  return exitCode === 0 ? stdout.trim() : undefined
}

// "<git icon> <branch>  ·  <absolute path of the checkout>", for the main checkout and a linked worktree alike.
// The icon is the Nerd Font git logo (nf-dev-git), so the terminal font must be a Nerd Font.
export async function locate($: EngineInterface): Promise<string | undefined> {
  const top = await git($, ['rev-parse', '--show-toplevel'])
  if (top === undefined) return undefined

  const branch = (await git($, ['branch', '--show-current'])) || `detached ${await git($, ['rev-parse', '--short', 'HEAD'])}`

  return ` ${branch}  ·  ${top}`
}

// 570123 → "570.1k", 1000000 → "1M".
function short(n: number): string {
  const [value, unit] = n >= 1e6 ? [n / 1e6, 'M'] : n >= 1e3 ? [n / 1e3, 'k'] : [n, '']
  return `${value.toFixed(1).replace(/\.0$/, '')}${unit}`
}

// "57% (570.1k / 1M)", or null until a response reports the fill.
function describe({ tokens, window, percent }: SessionContextUsage): string | null {
  return tokens === undefined || percent === undefined ? null : `${percent}% (${short(tokens)} / ${short(window)})`
}

async function refresh($: EngineInterface): Promise<void> {
  const text = (await locate($)) ?? null
  await update($, place, () => text)
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const started = await next(e)
    await refresh($)
    const { context } = await $.session.usage()
    await update($, fill, () => describe(context))
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

  on('session.measure', async ($, e, next) => {
    if (e.changed.includes('context')) await update($, fill, () => describe(e.context))
    return next(e)
  })

  // The location after the engine's hint, at the left of the footer under the prompt.
  on('ui.render', { component: 'PromptHint' }, async ($, e, next) => {
    const text = await read($, place)
    return next(text === null ? e : { ...e, props: { ...e.props, tail: `  ${text}` } })
  })

  // The context fill last among the mode labels, at the right end of the footer.
  on('ui.render', { component: 'SessionMode' }, async ($, e, next) => {
    const text = await read($, fill)
    return next(text === null ? e : { ...e, props: { ...e.props, modes: [...e.props.modes, text] } })
  })
}
