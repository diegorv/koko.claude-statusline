// Component: rate limit display with gradient bar

import { gradientBar, pctColor, formatResetIn, dim, RESET } from "../format"
import { ICONS } from "../constants"

/**
 * Renders a single rate limit as a formatted string with gradient bar, percentage, and reset countdown.
 * @param label - Display label for the rate limit (e.g. "5h", "7d").
 * @param rateLimit - Rate limit data with percentage and reset timestamp.
 * @returns Formatted rate limit string.
 */
export function renderRateLimit(label: string, rateLimit: { pct: number; resetsAt: number }): string {
  const prefix = label === "5h" ? `${ICONS.gauge} ` : ""
  let str = `${prefix}${label} ${gradientBar(rateLimit.pct, 8)} ${pctColor(rateLimit.pct)}${rateLimit.pct}%${RESET}`
  const reset = rateLimit.resetsAt ? formatResetIn(rateLimit.resetsAt) : ""
  if (reset) str += dim(` (${reset})`)
  return str
}
