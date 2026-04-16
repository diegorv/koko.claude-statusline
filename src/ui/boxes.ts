// Box rendering — assembles box output with custom title bars

import type { StdinData } from "../parsing/stdin"
import type { RenderResult } from "./render"
import { bold, c, nbsp, pctColor, gradientBar, formatDuration, vlen } from "./format"
import { box } from "./box"

/** Wraps border characters in dim ANSI to match the box borders. */
const dimBorder = (s: string) => `\x1b[2m${s}\x1b[0m`

// Title bar chrome: "╭─ " (3) + " " (1) + " " (1) + " ─╮" (3) = 8
const TITLE_CHROME = 8
// Single-side chrome: "╭─ " (3) + " ─╮" (2) = 5
const TITLE_CHROME_SINGLE = 5

/**
 * Renders the complete terminal output with session and activity boxes.
 * Builds custom title bars with model info, context usage, cost, and duration.
 * Both boxes share the same width for visual alignment.
 * @param data - Parsed stdin data from Claude Code (used for title bar info).
 * @param result - Pre-rendered content from the render() compositor.
 * @param repoName - Git repository name for the title bar (optional).
 * @returns Final string output ready for console.log.
 */
export function renderBoxes(data: StdinData, result: RenderResult, repoName?: string): string {
  const { session, activity, activityTitle } = result

  // === Box 1: Session ===
  const sessionLines = session.map(nbsp)

  const titleLeft = (repoName ? bold("yellow", repoName) + "  │  " : "")
    + c("cyan", data.model) + "  │  "
    + gradientBar(data.contextPercent, 10) + " " + pctColor(data.contextPercent) + Math.round(data.contextPercent) + "%\x1b[0m"

  const rightParts: string[] = []
  const costLabel = data.cost < 0.10 ? `${Math.round(data.cost * 100)}¢` : `$${data.cost.toFixed(2)}`
  rightParts.push(c("yellow", costLabel))
  if (data.durationMs >= 1000) rightParts.push(`⏱ ${formatDuration(data.durationMs)}`)
  const titleRight = rightParts.join("  ")

  const leftW = vlen(titleLeft)
  const rightW = vlen(titleRight)
  const sessionContentW = Math.max(...(sessionLines.length > 0 ? sessionLines.map(l => vlen(l)) : [0]))
  const sessionMinW = Math.max(sessionContentW + 6, leftW + rightW + 9)

  const actLines = activity.map(nbsp)
  const actContentW = Math.max(...(actLines.length > 0 ? actLines.map(l => vlen(l)) : [0]))
  const actTitleW = vlen(activityTitle)
  const actTitleLeftW = vlen("Activity")
  const actMinW = activity.length > 0 ? Math.max(actContentW + 6, actTitleLeftW + actTitleW + 9) : 0

  const boxWidth = Math.max(sessionMinW, actMinW)

  // Render session box
  const sessionBox = box(sessionLines.join("\n"), {
    padding: { top: 1, bottom: 0, left: 1 },
    width: boxWidth,
  })

  const sessionBoxLines = sessionBox.split("\n")
  const dashes = Math.max(1, boxWidth - leftW - rightW - TITLE_CHROME)
  sessionBoxLines[0] = `${dimBorder("╭─")} ${titleLeft} ${dimBorder("─".repeat(dashes))} ${titleRight} ${dimBorder("─╮")}`

  const output: string[] = [sessionBoxLines.join("\n")]

  // Render activity box (only if there's content)
  if (activity.length > 0) {
    const actBox = box(actLines.join("\n"), {
      padding: { top: 0, bottom: 0, left: 1 },
      width: boxWidth,
    })

    const actBoxLines = actBox.split("\n")
    if (activityTitle) {
      const actDashes = Math.max(1, boxWidth - actTitleLeftW - actTitleW - TITLE_CHROME)
      actBoxLines[0] = `${dimBorder("╭─")} Activity ${dimBorder("─".repeat(actDashes))} ${activityTitle} ${dimBorder("─╮")}`
    } else {
      const actDashes = Math.max(1, boxWidth - actTitleLeftW - TITLE_CHROME_SINGLE)
      actBoxLines[0] = `${dimBorder("╭─")} Activity ${dimBorder("─".repeat(actDashes) + "╮")}`
    }

    output.push(actBoxLines.join("\n"))
  }

  return output.join("\n")
}
