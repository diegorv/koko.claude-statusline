import { appendFileSync } from "node:fs"
import type { AgentSnapshot } from "../core/snapshot.ts"
import type { render } from "../ui/render.ts"
import { vlen } from "../ui/format.ts"

export function logDiagnostics(snapshot: AgentSnapshot, panel: ReturnType<typeof render>, width: number | null): void {
  const debugLogPath = process.env.KOKO_STATUSLINE_DEBUG_LOG ?? process.env.CLAUDE_STATUSLINE_DEBUG_LOG
  if (!debugLogPath) return
  const { data, activity: transcript } = snapshot
  try {
    const rows = panel.output.split("\n")
    const widths = rows.map(vlen)
    const termW = width ?? 0
    appendFileSync(debugLogPath, JSON.stringify({
      agent: data.agent,
      t: new Date().toISOString(),
      pid: process.pid,
      sid: data.sessionId?.slice(0, 8) ?? null,
      rows: rows.length,
      maxW: widths.length ? Math.max(...widths) : 0,
      termW,
      overflow: termW > 0 ? widths.filter(w => w > termW).length : 0,
      session: panel.sessionRows,
      activity: panel.activityRows,
      runT: transcript?.runningTools.length ?? 0,
      doneT: transcript?.tools.size ?? 0,
      agents: transcript?.agents.length ?? 0,
    }) + "\n")
  } catch {}
}
