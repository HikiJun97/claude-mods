// One line of the footer, null while there is nothing to show.
export type Line = string | null

declare module 'claude-code' {
  interface PluginState {
    'where-am-i': {
      // "<git icon> <branch>  ·  <absolute path>", null outside a git repo.
      place: Line
      // "57% (570.1k / 1M)", null until a response reports the fill.
      fill: Line
    }
  }
}
