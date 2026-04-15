// Claude Code statusline — Bun + TypeScript
// Usage: configured in ~/.claude/settings.json as statusLine command
// Test:  echo '{"model":{"display_name":"Opus"}}' | bun src/index.ts

import { parseStdin } from "./stdin"
import { getGitInfo } from "./git"
import { getConfigCounts } from "./config"
import { parseTranscript } from "./transcript"
import { renderLines } from "./render"
import { bold, c, dim, nbsp, pctColor, gradientBar, formatDuration } from "./format"
import boxen from "boxen"

const ANSI_RE = /\x1b\[[0-9;]*m/g
const vlen = (s: string) => [...s.replace(ANSI_RE, "")].length

const data = await parseStdin()
const git = data.cwd ? getGitInfo(data.cwd) : null
const config = data.cwd ? getConfigCounts(data.cwd) : null
const transcript = data.transcriptPath ? parseTranscript(data.transcriptPath) : null
const lines = renderLines(data, git, config, transcript)

const nbspLines = lines.map(nbsp)

// Build colored title (left side)
const titleLeft = (git?.repo ? bold("yellow", git.repo) + "  │  " : "")
  + c("cyan", data.model) + "  │  "
  + gradientBar(data.ctx, 10) + " " + pctColor(data.ctx) + Math.round(data.ctx) + "%\x1b[0m"

// Build right side (cost + duration)
const rightParts: string[] = []
const costLabel = data.cost < 0.10 ? `${Math.round(data.cost * 100)}¢` : `$${data.cost.toFixed(2)}`
rightParts.push(c("yellow", costLabel))
if (data.dur >= 1000) rightParts.push(dim(`⏱ ${formatDuration(data.dur)}`))
const titleRight = rightParts.join("  ")

// Render box WITHOUT title, then replace top border with our custom title line
const contentWidth = Math.max(...nbspLines.map(l => vlen(l)))
const leftWidth = vlen(titleLeft)
const rightWidth = vlen(titleRight)
const minBoxWidth = leftWidth + rightWidth + 9 // 8 overhead + 1 min dash
const boxWidth = Math.max(contentWidth + 6, minBoxWidth)

const raw = boxen(nbspLines.join("\n"), {
  padding: { top: 0, bottom: 0, left: 1, right: 1 },
  borderStyle: "round",
  dimBorder: true,
  width: boxWidth,
})

// Replace first line: ╭─ leftTitle ──── rightTitle ─╮
const boxLines = raw.split("\n")
// ╭─(2) + space(1) + LEFT + space(1) + dashes + space(1) + RIGHT + space(1) + ─╮(2) = 8 overhead
const dashes = Math.max(1, boxWidth - leftWidth - rightWidth - 8)
boxLines[0] = `╭─ ${titleLeft} ${"─".repeat(dashes)} ${titleRight} ─╮`

console.log(boxLines.join("\n"))
