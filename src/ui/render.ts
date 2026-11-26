import type { AgentSnapshot } from "../core/snapshot.ts"
import type { WorkspaceSnapshot } from "../core/workspace.ts"
import type { PanelLayout } from "./layout.ts"
import { renderLines } from "./lines.ts"
import { composeRows } from "./rows.ts"

export function render(snapshot: AgentSnapshot, workspace: WorkspaceSnapshot, layout: PanelLayout) {
  const rows = composeRows(snapshot, workspace)
  return {
    output: renderLines(snapshot.data, rows, layout, workspace.git?.repo),
    sessionRows: rows.session.length,
    activityRows: rows.activity.length,
  }
}
