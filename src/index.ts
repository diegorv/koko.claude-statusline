// Claude Code statusline — Bun + TypeScript
// Usage: configured in ~/.claude/settings.json as statusLine command
// Test:  echo '{"model":{"display_name":"Opus"}}' | bun src/index.ts

import { parseStdin } from "./stdin"
import { getGitInfo } from "./git"
import { getConfigCounts } from "./config"
import { parseTranscript } from "./transcript"
import { renderLines } from "./render"
import { nbsp } from "./format"
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

const title = (git?.repo ? git.repo + "  │  " : "")
  + data.model + "  │  "
  + simpleBar(data.ctx, 10) + " " + Math.round(data.ctx) + "%"

const contentWidth = Math.max(...nbspLines.map(l => vlen(l)))
const titleWidth = vlen(title)
const boxWidth = Math.max(contentWidth + 6, titleWidth + 6)

const output = boxen(nbspLines.join("\n"), {
  title,
  titleAlignment: "left",
  padding: { top: 0, bottom: 0, left: 1, right: 1 },
  borderStyle: "round",
  dimBorder: true,
  width: boxWidth,
})
console.log(output)
