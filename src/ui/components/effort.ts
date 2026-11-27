import type { EffortLevel } from "../../core/model.ts"
import { effortContent } from "../content/session.ts"
import { ansiContent } from "../format.ts"

export function renderEffort(level: EffortLevel | null): string | null {
  const group = effortContent(level)
  return group ? ansiContent(group) : null
}
