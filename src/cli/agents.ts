import { antigravityAdapter } from "../agents/antigravity/adapter.ts"
import { claudeAdapter } from "../agents/claude/adapter.ts"
import type { AgentAdapter } from "../core/adapter.ts"

const adapters: AgentAdapter[] = [claudeAdapter, antigravityAdapter]

/** Explicit selection wins. Unmarked payloads remain Claude-compatible. */
export function selectAdapter(raw: Record<string, unknown>, requested?: string): AgentAdapter {
  const id = requested ?? raw.product ?? "claude"
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
