export interface PanelLayout {
  terminalWidth: number | null
  rightMargin: number
  frameWidth: "content" | "available"
}

/** Hosts supply their policy and environment so rendering can use resolved values. */
export function resolveLayout(
  terminalWidth: number | null,
  defaults: Pick<PanelLayout, "rightMargin" | "frameWidth">,
  env: Readonly<Record<string, string | undefined>>,
): PanelLayout {
  const margin = Number.parseInt(env.KOKO_STATUSLINE_RIGHT_MARGIN ?? env.CLAUDE_STATUSLINE_RIGHT_MARGIN ?? "", 10)
  return {
    terminalWidth, frameWidth: defaults.frameWidth,
    rightMargin: Number.isFinite(margin) && margin >= 0 ? margin : defaults.rightMargin,
  }
}
