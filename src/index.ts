// Claude Code statusline — Bun + TypeScript
// Usage: configured in ~/.claude/settings.json as statusLine command
// Test:  echo '{"model":{"display_name":"Opus"}}' | bun src/index.ts

import { parseStdin } from "./stdin"
import { getGitInfo } from "./git"
import { getConfigCounts } from "./config"
import { parseTranscript } from "./transcript"
import { renderLines } from "./render"
import { bold, c, nbsp, pctColor } from "./format"
import boxen from "boxen"

const ANSI_RE = /\x1b\[[0-9;]*m/g
const vlen = (s: string) => [...s.replace(ANSI_RE, "")].length

function simpleBar(pct: number, width = 10): string {
  const filled = Math.round((pct * width) / 100)
  return "█".repeat(filled) + "░".repeat(width - filled)
}

const data = await parseStdin()
const git = data.cwd ? getGitInfo(data.cwd) : null
const config = data.cwd ? getConfigCounts(data.cwd) : null
const transcript = data.transcriptPath ? parseTranscript(data.transcriptPath) : null
const lines = renderLines(data, git, config, transcript)

const nbspLines = lines.map(nbsp)

// Build colored title
const title = (git?.repo ? bold("yellow", git.repo) + "  │  " : "")
  + c("cyan", data.model) + "  │  "
  + simpleBar(data.ctx, 10) + " " + pctColor(data.ctx) + Math.round(data.ctx) + "%\x1b[0m"

// Render box WITHOUT title, then replace top border with our colored title
const contentWidth = Math.max(...nbspLines.map(l => vlen(l)))
const titleWidth = vlen(title)
const boxWidth = Math.max(contentWidth + 6, titleWidth + 6)

const raw = boxen(nbspLines.join("\n"), {
  padding: { top: 0, bottom: 0, left: 1, right: 1 },
  borderStyle: "round",
  dimBorder: true,
  width: boxWidth,
})

// Replace first line (top border) with custom title line
const boxLines = raw.split("\n")
const dashes = Math.max(1, boxWidth - vlen(title) - 5) // 5 = ╭─(2) + space(1) + space(1) + ╮(1)
boxLines[0] = `╭─ ${title} ${"─".repeat(dashes)}╮`

console.log(boxLines.join("\n"))
