// Component: rate limit display with gradient bar

import { gradientBar, pctColor, formatResetIn, dim, RESET } from "../format.ts"

/**
 * Renders a single rate limit as a formatted string with gradient bar,
 * percentage, and reset countdown. The row that hosts the rate limits owns
 * the gauge icon as its gutter, so this component does NOT prefix its own
 * icon — that would be a duplicate.
 *
 * @param label - Display label for the rate limit (e.g. "5h", "7d").
 * @param rateLimit - Rate limit data with percentage and reset timestamp.
 */
export function renderRateLimit(label: string, rateLimit: { pct: number | null; resetsAt: number; remaining?: number | null; disabled?: boolean }): string {
  let str = rateLimit.disabled ? `${label} ${dim("disabled")}`
    : rateLimit.pct !== null ? `${label} ${gradientBar(rateLimit.pct, 8)} ${pctColor(rateLimit.pct)}${rateLimit.pct}%${RESET}`
    : `${label} ${rateLimit.remaining ?? "?"} left`
  const reset = rateLimit.resetsAt ? formatResetIn(rateLimit.resetsAt) : ""
  if (reset) str += dim(` (${reset})`)
  return str
}
