// Claude Code statusline — Bun + TypeScript
// Usage: configured in ~/.claude/settings.json as statusLine command
// Test:  echo '{"model":{"display_name":"Opus"}}' | bun src/index.ts

import { appendFileSync } from "node:fs"
import { basename } from "node:path"
import { parseStdin } from "./parsing/stdin"
import { getGitInfo } from "./collection/git"
import { getConfigCounts } from "./collection/config"
import { parseTranscript } from "./parsing/transcript"
import { render } from "./ui/render"
import { renderLines } from "./ui/lines"
import { vlen } from "./ui/format"
import { getTerminalWidth } from "./ui/terminal"

const data = await parseStdin()
const git = data.cwd ? getGitInfo(data.cwd) : null
const config = data.cwd ? getConfigCounts(data.cwd) : null
const transcript = data.transcriptPath ? parseTranscript(data.transcriptPath) : null
const result = render(data, git, config, transcript)
const output = renderLines(data, result, git?.repo)
console.log(output)

// Optional debug log: when CLAUDE_STATUSLINE_DEBUG_LOG is set to a file path,
// append one JSON line per invocation describing the rendered output. Useful
// for diagnosing layout issues like row-count drift or width detection
// glitches that only show up under live event-driven refreshes.
const debugLogPath = process.env.CLAUDE_STATUSLINE_DEBUG_LOG
if (debugLogPath) {
  try {
    const rows = output.split("\n")
    const widths = rows.map(vlen)
    // Same stabilityKey renderLines() used, so logged termW matches what shaped output.
    const termW = getTerminalWidth({ stabilityKey: data.transcriptPath }) ?? 0
    appendFileSync(debugLogPath, JSON.stringify({
      t: new Date().toISOString(),
      pid: process.pid,
      sid: data.transcriptPath ? basename(data.transcriptPath, ".jsonl").slice(0, 8) : null,
      rows: rows.length,
      maxW: widths.length ? Math.max(...widths) : 0,
      termW,
      overflow: termW > 0 ? widths.filter(w => w > termW).length : 0,
      session: result.session.length,
      activity: result.activity.length,
      runT: transcript?.runningTools.length ?? 0,
      doneT: transcript?.tools.size ?? 0,
      agents: transcript?.agents.length ?? 0,
    }) + "\n")
  } catch {}
}
