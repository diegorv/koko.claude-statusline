// Agent statusline — Bun + TypeScript
// Usage: statusLine command; auto-detect payload or pass --agent claude|antigravity
// Test:  echo '{"model":{"display_name":"Opus"}}' | bun src/index.ts

import { appendFileSync } from "node:fs"
import { parseStdin } from "./cli/stdin.ts"
import { parseAgentArgument, selectAdapter } from "./cli/agents.ts"
import { readLocalWorkspace } from "./cli/workspace/read.ts"
import { render } from "./ui/render.ts"
import { renderLines } from "./ui/lines.ts"
import { vlen } from "./ui/format.ts"
import { getTerminalWidth } from "./ui/terminal.ts"
import { exportPaneHeader } from "./export/pane-header.ts"

let adapter
try {
  const requestedAgent = parseAgentArgument(process.argv.slice(2))
  if (requestedAgent) adapter = selectAdapter({}, requestedAgent)
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
}
const raw = parseStdin()
if (!raw) process.exit(0)
try {
  adapter ??= selectAdapter(raw)
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
}
const snapshot = adapter.read(raw)
const { data, activity: transcript } = snapshot
const workspace = readLocalWorkspace(data.cwd)
const result = render(snapshot, workspace)
const output = renderLines(data, result, workspace.git?.repo)
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
      sid: data.sessionId?.slice(0, 8) ?? null,
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
