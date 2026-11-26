import { antigravityAdapter } from "../agents/antigravity/adapter.ts"
import { claudeAdapter } from "../agents/claude/adapter.ts"
import type { StdinAdapter } from "./adapter.ts"

const adapters: StdinAdapter[] = [claudeAdapter, antigravityAdapter]

/** Explicit selection wins. Unmarked payloads remain Claude-compatible. */
export function selectAdapter(raw: Record<string, unknown>, requested?: string): StdinAdapter {
  const id = requested ?? raw.product ?? "claude"
  if (id === "opencode") throw new Error("OpenCode uses the TUI plugin in integrations/opencode, not a stdin statusLine command.")
  const adapter = adapters.find(adapter => adapter.id === id)
  if (!adapter) throw new Error(`Unsupported agent: ${String(id)}. Supported agents: ${adapters.map(a => a.id).join(", ")}.`)
  return adapter
}

export function parseAgentArgument(args: string[]): string | undefined {
  if (args.length === 0) return undefined
  if (args.length === 2 && args[0] === "--agent" && args[1]) return args[1]
  if (args.length === 1 && args[0].startsWith("--agent=") && args[0].slice(8)) return args[0].slice(8)
  throw new Error("Usage: statusline [--agent claude|antigravity]")
}
