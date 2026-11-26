import type { AgentId, ActivityData, ConfigSummary, SessionData } from "../model.ts"
import type { CavemanState } from "../collection/caveman.ts"

export interface AgentSnapshot {
  data: SessionData
  config: ConfigSummary | null
  activity: ActivityData | null
  skipPermissions: boolean
  caveman: CavemanState | null
}

/** Reads a provider payload and any provider-owned local sources it needs. */
export interface AgentAdapter {
  id: AgentId
  read(raw: Record<string, unknown>): AgentSnapshot
}
