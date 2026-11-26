import type { ActivityData, ConfigSummary, SessionData } from "./model.ts"

/** The renderer styles each part and separates adjacent parts with one plain space. */
export interface HeaderAnnotation {
  color: "orange"
  parts: string[]
}

export interface AgentSnapshot {
  data: SessionData
  config: ConfigSummary | null
  activity: ActivityData | null
  skipPermissions: boolean
  headerAnnotations: HeaderAnnotation[]
}
