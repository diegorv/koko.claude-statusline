import type { AgentId, ActivityData, ConfigSummary, SessionData } from "./model.ts"

export interface AgentSnapshot {
  data: SessionData
  config: ConfigSummary | null
  activity: ActivityData | null
  skipPermissions: boolean
  /** Optional ANSI header annotations, formatted by the owning agent. */
  headerBadges: string[]
}

/** Reads a provider payload and any provider-owned local sources it needs. */
export interface AgentAdapter<Input = Record<string, unknown>> {
  id: AgentId
  read(raw: Input): AgentSnapshot
}
