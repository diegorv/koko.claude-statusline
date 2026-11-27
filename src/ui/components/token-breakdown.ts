import type { TokenTotals } from "../../core/model.ts"
import { tokenContent } from "../content/consumption.ts"
import { ansiContent } from "../format.ts"

export function renderTokenBreakdown(totals: TokenTotals): string | null {
  const group = tokenContent(totals, "panel")
  return group ? ansiContent(group) : null
}
