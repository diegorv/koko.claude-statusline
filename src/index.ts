// Agent statusline — Bun + TypeScript
// Usage: statusLine command; auto-detect payload or pass --agent claude|antigravity
// Test:  echo '{"model":{"display_name":"Opus"}}' | bun src/index.ts

import { appendFileSync } from "node:fs"
import { basename } from "node:path"
import { parseStdin } from "./parsing/stdin.ts"
import { parseAgentArgument, selectAdapter } from "./adapters/index.ts"
import { getGitInfo } from "./collection/git.ts"
import { getWorktrunkInfo } from "./collection/worktrunk.ts"
import { render } from "./ui/render.ts"
import { renderLines } from "./ui/lines.ts"
import { vlen } from "./ui/format.ts"
import { getTerminalWidth } from "./ui/terminal.ts"
import { exportPaneHeader } from "./export/pane-header.ts"

let requestedAgent: string | undefined
try {
  requestedAgent = parseAgentArgument(process.argv.slice(2))
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
}
const raw = parseStdin()
if (!raw) process.exit(0)
let adapter
try {
  adapter = selectAdapter(raw, requestedAgent)
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
}
const { data, config, activity: transcript, skipPermissions, caveman } = adapter.read(raw)
const git = data.cwd ? getGitInfo(data.cwd) : null
// wt costs ~100ms, so only ask it inside linked worktrees.
const worktrunk = data.cwd && git?.worktree ? getWorktrunkInfo(data.cwd) : null
const result = render(data, git, config, transcript, skipPermissions, caveman, worktrunk)
const output = renderLines(data, result, git?.repo)
console.log(output)

// Optional session snapshot for a terminal-side pane header (see src/export/pane-header.ts).
exportPaneHeader(process.env, data, data.effortLevel)

// Optional debug log: when CLAUDE_STATUSLINE_DEBUG_LOG is set to a file path,
// append one JSON line per invocation describing the rendered output. Useful
// for diagnosing layout issues like row-count drift or width detection
// glitches that only show up under live event-driven refreshes.
const debugLogPath = process.env.KOKO_STATUSLINE_DEBUG_LOG ?? process.env.CLAUDE_STATUSLINE_DEBUG_LOG
if (debugLogPath) {
  try {
    const rows = output.split("\n")
    const widths = rows.map(vlen)
    // Same stabilityKey renderLines() used, so logged termW matches what shaped output.
    const termW = data.terminalWidth ?? getTerminalWidth({ stabilityKey: data.transcriptPath }) ?? 0
    appendFileSync(debugLogPath, JSON.stringify({
      agent: data.agent,
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
