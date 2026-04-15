// Claude Code statusline — Bun + TypeScript
// Usage: configured in ~/.claude/settings.json as statusLine command
// Test:  echo '{"model":{"display_name":"Opus"}}' | bun src/index.ts

import { parseStdin } from "./stdin"
import { getGitInfo } from "./git"
import { getConfigCounts } from "./config"
import { parseTranscript } from "./transcript"
import { renderLines } from "./render"
import { c, bold, nbsp } from "./format"
import boxen from "boxen"

const ANSI_RE = /\x1b\[[0-9;]*m/g
const vlen = (s: string) => [...s.replace(ANSI_RE, "")].length

const data = await parseStdin()
const git = data.cwd ? getGitInfo(data.cwd) : null
const config = data.cwd ? getConfigCounts(data.cwd) : null
const transcript = data.transcriptPath ? parseTranscript(data.transcriptPath) : null
const lines = renderLines(data, git, config, transcript)

const nbspLines = lines.map(nbsp)
const contentWidth = Math.max(...nbspLines.map(l => vlen(l)))

const output = boxen(nbspLines.join("\n"), {
  title: (git?.repo ? bold("yellow", git.repo) + "  │  " : "") + c("cyan", data.model),
  titleAlignment: "left",
  padding: { top: 0, bottom: 0, left: 1, right: 1 },
  borderStyle: "round",
  dimBorder: true,
  width: contentWidth + 6, // borders(2) + padding(2) + breathing room(2)
})
console.log(output)
