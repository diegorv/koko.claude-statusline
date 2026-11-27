import type { RateLimit, SessionData } from "../../core/model.ts"
import { displayText, type ContentGroup, type StyledText } from "./session.ts"

export function filledCells(percent: number, width: number): number {
  return Math.min(width, Math.max(0, Math.round(percent * width / 100)))
}

export function percentageStyle(percent: number): "green" | "yellow" | "amber" | "red" {
  if (percent >= 90) return "red"
  if (percent >= 70) return "amber"
  if (percent >= 50) return "yellow"
  return "green"
}

/**
 * Formats the time remaining until a reset epoch as a human-readable countdown.
 * Switches unit by magnitude so the result stays compact and readable:
 *   < 60m  → "23m"
 *   < 48h  → "1h 15m" / "47h"
 *   >= 48h → "6d 5h" / "7d"  (minutes dropped — irrelevant at this scale)
 * Returns empty string if the reset time is in the past.
 * @param epochSec - Reset timestamp in seconds since Unix epoch.
 * @returns Formatted countdown string, or empty if already past.
 */
export function resetCountdown(epochSec: number, nowMs: number): string {
  const diff = epochSec * 1000 - nowMs
  if (diff <= 0) return ""
  const mins = Math.ceil(diff / 60000)
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h >= 48) {
    const d = Math.floor(h / 24)
    const hr = h % 24
    return hr > 0 ? `${d}d ${hr}h` : `${d}d`
  }
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

/**
 * Formats a token count in compact form: `148k`, `1.2m`, `450`.
 * Uses 1 decimal place only when the value isn't a whole multiple of the unit.
 *
 * The 'k' threshold is 950 (not 1000) so values like 999_500 format as `1m`
 * instead of the misleading `1000k` that naive rounding would produce.
 */
export function formatTokens(n: number): string {
  if (n >= 950_000) {
    const v = n / 1_000_000
    const rounded = Math.round(v * 10) / 10
    return rounded === Math.trunc(rounded) ? `${rounded}m` : `${rounded.toFixed(1)}m`
  }
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`
  return `${n}`
}

export function contextTokenRatio(occupied: number, capacity: number): string {
  return `${formatTokens(occupied)}/${formatTokens(capacity)}`
}

function compactMeter(percent: number, shown: number): StyledText {
  const width = 4
  const filled = filledCells(percent, width)
  return { text: "█".repeat(filled) + "░".repeat(width - filled) + ` ${shown}%`, style: percentageStyle(percent) }
}

export function contextContent(data: SessionData): ContentGroup | null {
  const { contextPercent: percent, contextTokens: occupied, contextWindowSize: capacity } = data
  if (percent === null && occupied === null && capacity === null) return null
  const spans: StyledText[] = [{ text: "ctx " }]
  if (percent !== null) spans.push(compactMeter(percent, Math.round(percent)))
  let tokens: string | undefined
  if (occupied !== null && capacity !== null) tokens = contextTokenRatio(occupied, capacity)
  else if (occupied !== null) tokens = `${formatTokens(occupied)} used`
  else if (capacity !== null) tokens = `${formatTokens(capacity)} cap`
  if (tokens) spans.push({ text: (percent === null ? "" : " ") + tokens, style: "dim" })
  return { kind: "context", spans }
}

export function quotaContent(limit: RateLimit, nowMs: number): ContentGroup {
  const spans: StyledText[] = [{ text: displayText(limit.label) }]
  if (limit.pct !== null) {
    spans.push({ text: " " }, compactMeter(limit.pct, limit.pct), { text: " used" })
  }
  const countdown = limit.resetsAt === null ? "" : resetCountdown(limit.resetsAt, nowMs)
  if (countdown) spans.push({ text: ` (${countdown})`, style: "dim" })
  return { kind: "quota", spans }
}
