import type { ActivityData, ConfigSummary, SessionData, TokenTotals } from "./model.ts"

/** The renderer styles each part and separates adjacent parts with one plain space. */
export interface HeaderAnnotation {
  color: "orange"
  parts: string[]
}

export interface AgentSnapshot {
  data: SessionData
  config: ConfigSummary | null
  tokenTotals: TokenTotals | null
  activity: ActivityData | null
  skipPermissions: boolean
  headerAnnotations: HeaderAnnotation[]
}
