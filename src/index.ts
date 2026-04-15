// Claude Code statusline — Bun + TypeScript
// Usage: configured in ~/.claude/settings.json as statusLine command
// Test:  echo '{"model":{"display_name":"Opus"}}' | bun src/index.ts

import { parseStdin } from "./stdin"
import { getGitInfo } from "./git"
import { getConfigCounts } from "./config"
import { parseTranscript } from "./transcript"
import { render } from "./render"
import { bold, c, nbsp, pctColor, gradientBar, formatDuration, vlen } from "./format"
import boxen from "boxen"

const data = await parseStdin()
const git = data.cwd ? getGitInfo(data.cwd) : null
const config = data.cwd ? getConfigCounts(data.cwd) : null
const transcript = data.transcriptPath ? parseTranscript(data.transcriptPath) : null
const { session, activity, activityTitle } = render(data, git, config, transcript)

// === Box 1: Session ===
const sessionLines = session.map(nbsp)

const titleLeft = (git?.repo ? bold("yellow", git.repo) + "  │  " : "")
  + c("cyan", data.model) + "  │  "
  + gradientBar(data.contextPercent, 10) + " " + pctColor(data.contextPercent) + Math.round(data.contextPercent) + "%\x1b[0m"

const rightParts: string[] = []
const costLabel = data.cost < 0.10 ? `${Math.round(data.cost * 100)}¢` : `$${data.cost.toFixed(2)}`
rightParts.push(c("yellow", costLabel))
if (data.durationMs >= 1000) rightParts.push(`⏱ ${formatDuration(data.durationMs)}`)
const titleRight = rightParts.join("  ")

const leftW = vlen(titleLeft)
const rightW = vlen(titleRight)
// Calculate both box widths first, then use the max so they match
const sessionContentW = Math.max(...(sessionLines.length > 0 ? sessionLines.map(l => vlen(l)) : [0]))
const sessionMinW = Math.max(sessionContentW + 6, leftW + rightW + 9)

const actLines = activity.map(nbsp)
const actContentW = activity.length > 0 ? Math.max(...actLines.map(l => vlen(l))) : 0
const actTitleW = vlen(activityTitle)
const actTitleLeftW = vlen("Activity")
const actMinW = activity.length > 0 ? Math.max(actContentW + 6, actTitleLeftW + actTitleW + 9) : 0

const boxWidth = Math.max(sessionMinW, actMinW)

// Render box 1
const sessionBox = boxen(sessionLines.join("\n"), {
  padding: { top: 1, bottom: 0, left: 1, right: 1 },
  borderStyle: "round",
  dimBorder: true,
  width: boxWidth,
})

const sessionBoxLines = sessionBox.split("\n")
const dashes = Math.max(1, boxWidth - leftW - rightW - 8)
sessionBoxLines[0] = `╭─ ${titleLeft} ${"─".repeat(dashes)} ${titleRight} ─╮`

console.log(sessionBoxLines.join("\n"))

// Render box 2 (only if there's content)
if (activity.length > 0) {
  const actBox = boxen(actLines.join("\n"), {
    padding: { top: 0, bottom: 0, left: 1, right: 1 },
    borderStyle: "round",
    dimBorder: true,
    width: boxWidth,
  })

  const actBoxLines = actBox.split("\n")
  if (activityTitle) {
    const actDashes = Math.max(1, boxWidth - actTitleLeftW - actTitleW - 8)
    actBoxLines[0] = `╭─ Activity ${"─".repeat(actDashes)} ${activityTitle} ─╮`
  } else {
    const actDashes = Math.max(1, boxWidth - actTitleLeftW - 5)
    actBoxLines[0] = `╭─ Activity ${"─".repeat(actDashes)}╮`
  }

  console.log(actBoxLines.join("\n"))
}
