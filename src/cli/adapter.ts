import type { AgentSnapshot } from "../core/snapshot.ts"

export interface StdinAdapter {
  id: "claude" | "antigravity"
  read(raw: Record<string, unknown>): { snapshot: AgentSnapshot; stabilityKey: string | null }
}
