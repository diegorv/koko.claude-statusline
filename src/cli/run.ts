import { parseStdin } from "./stdin.ts"
import { parseAgentArgument, selectAdapter } from "./agents.ts"
import { readLocalWorkspace } from "./workspace/read.ts"
import { getTerminalWidth } from "./terminal-width.ts"
import { reportedWidth } from "../agents/antigravity/adapter.ts"
import { render } from "../ui/render.ts"
import { resolveLayout } from "../ui/layout.ts"
import { exportPaneHeader } from "../export/pane-header.ts"
import { logDiagnostics } from "./debug.ts"

export function run(args: string[]): number {
  let adapter
  try {
    const requestedAgent = parseAgentArgument(args)
    if (requestedAgent) adapter = selectAdapter({}, requestedAgent)
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    return 1
  }
  const raw = parseStdin()
  if (!raw) return 0
  try {
    adapter ??= selectAdapter(raw)
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    return 1
  }
  const { snapshot, stabilityKey } = adapter.read(raw)
  const { data } = snapshot
  const claude = adapter.id === "claude"
  const suppliedWidth = claude ? null : reportedWidth(raw)
  const width = suppliedWidth ?? getTerminalWidth({ stabilityKey })
  const layout = resolveLayout(width, claude
    ? { rightMargin: 16, frameWidth: "content" }
    : { rightMargin: 0, frameWidth: "available" }, process.env)
  const panel = render(snapshot, readLocalWorkspace(data.cwd), layout)
  console.log(panel.output)
  exportPaneHeader(process.env, data, data.effortLevel)
  logDiagnostics(snapshot, panel, width)
  return 0
}
