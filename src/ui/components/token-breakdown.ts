// Component: per-session token breakdown (input / output / cache total)

import type { TokenTotals } from "../../parsing/transcript.ts"
import { c, dim, formatTokens } from "../format.ts"

/**
 * Renders a compact session-level token breakdown:
 *   ↑12k ↓3k ◆80k
 * where ↑ = input, ↓ = output, ◆ = cache (creation + read combined). All counts
 * are formatted via `formatTokens` for the same readability as the context bar.
 *
 * Returns null when every total is zero — typically the first refresh of a
 * fresh session before any assistant turn has landed.
 */
export function renderTokenBreakdown(totals: TokenTotals): string | null {
  const cacheTotal = totals.cacheCreate + totals.cacheRead
  if (totals.input === 0 && totals.output === 0 && cacheTotal === 0) return null

  const parts: string[] = []
  parts.push(`${c("cyan", "↑")}${formatTokens(totals.input)}`)
  parts.push(`${c("green", "↓")}${formatTokens(totals.output)}`)
  if (cacheTotal > 0) parts.push(dim(`◆${formatTokens(cacheTotal)}`))
  return parts.join(" ")
}
