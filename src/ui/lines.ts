// Flat-line layout — header (left + right) with horizontal rule and content rows.

import type { StdinData } from "../parsing/stdin"
import type { RenderResult } from "./render"
import { bold, c, dim, formatDuration, formatTokens, gradientBar, nbsp, pctColor, RESET, vlen } from "./format"
import { SEP, inRuleColor } from "./constants"
import { getTerminalWidth } from "./terminal"

// Very faint gray — used for the dashes that fill the middle of the header.
// Noticeably darker than RULE_COLOR so the filler stays secondary and the eye
// jumps straight to the header content on either side.
const FAINT_COLOR = "\x1b[38;2;60;60;70m"
const faint = (s: string) => `${FAINT_COLOR}${s}${RESET}`

const RULE_CHAR = "─"
const LEFT_PAD = " "
const HEADER_GAP = " "
const DEFAULT_RIGHT_MARGIN = 16
const MIN_USABLE_WIDTH = 40

const rule = (s: string) => inRuleColor(s)

/**
 * Wraps a line at separator boundaries so each output row fits maxWidth.
 * Lines that have no separator (or already fit) are returned unchanged.
 */
function wrapLine(line: string, maxWidth: number, separator: string): string[] {
  if (vlen(line) <= maxWidth) return [line]
  const segments = line.split(separator)
  if (segments.length <= 1) return [line]

  const out: string[] = []
  let current = segments[0]
  for (let i = 1; i < segments.length; i++) {
    const candidate = current + separator + segments[i]
    if (vlen(candidate) <= maxWidth) {
      current = candidate
    } else {
      out.push(current)
      current = segments[i]
    }
  }
  if (current) out.push(current)
  return out
}

/** Left side of the header: repo (if any) · model · [effort] · context bar · %. */
function buildHeaderLeft(data: StdinData, repoName: string | undefined, effort: string | null): string {
  const parts: string[] = []
  if (repoName) parts.push(bold("yellow", repoName))
  parts.push(c("cyan", data.model))
  if (effort) parts.push(effort)
  const pct = Math.round(data.contextPercent)
  const tokensLabel = data.contextTokens != null && data.contextWindowSize
    ? " " + dim(`${formatTokens(data.contextTokens)}/${formatTokens(data.contextWindowSize)}`)
    : ""
  parts.push(`${gradientBar(data.contextPercent, 10)} ${pctColor(data.contextPercent)}${pct}%${RESET}${tokensLabel}`)
  return parts.join(SEP)
}

/** Right side of the header: cost · duration · activity title (config counts). */
function buildHeaderRight(data: StdinData, activityTitle: string): string {
  const parts: string[] = []
  const costLabel = data.cost < 0.10 ? `${Math.round(data.cost * 100)}¢` : `$${data.cost.toFixed(2)}`
  parts.push(c("yellow", costLabel))
  if (data.durationMs >= 1000) parts.push(`⏱ ${formatDuration(data.durationMs)}`)
  if (activityTitle) parts.push(dim(activityTitle))
  return parts.join(SEP)
}

/**
 * Joins left and right header sides with dimmed dashes filling the middle.
 * Falls back to a simple SEP join when there isn't enough room for dashes.
 */
function joinHeader(left: string, right: string, maxWidth: number): string {
  if (!right) return left
  const leftW = vlen(left)
  const rightW = vlen(right)
  // Need at least: left + " " + 3 dashes + " " + right
  const minDashWidth = 3
  const minCombined = leftW + HEADER_GAP.length + minDashWidth + HEADER_GAP.length + rightW
  if (maxWidth < minCombined) {
    // Not enough room to spread — fall back to plain SEP join (will wrap if too long).
    return left + SEP + right
  }
  const dashes = maxWidth - leftW - rightW - 2 * HEADER_GAP.length
  return left + HEADER_GAP + faint(RULE_CHAR.repeat(dashes)) + HEADER_GAP + right
}

/** Resolves the configured right margin (env override → default). */
function resolveRightMargin(): number {
  const env = Number.parseInt(process.env.CLAUDE_STATUSLINE_RIGHT_MARGIN ?? "", 10)
  return Number.isFinite(env) && env >= 0 ? env : DEFAULT_RIGHT_MARGIN
}

/**
 * Renders the status line as flat rows:
 *   1. header — left (model/context) · dashes · right (cost/duration/config counts)
 *   2. horizontal rule
 *   3. session content rows
 *   4. activity content rows
 *
 * Rows wider than the terminal are wrapped at separator boundaries.
 */
export function renderLines(data: StdinData, result: RenderResult, repoName?: string): string {
  const terminalWidth = getTerminalWidth()
  const margin = resolveRightMargin()
  const usableWidth = terminalWidth
    ? Math.max(MIN_USABLE_WIDTH, terminalWidth - margin - LEFT_PAD.length)
    : Number.POSITIVE_INFINITY

  const left = buildHeaderLeft(data, repoName, result.effort)
  const right = buildHeaderRight(data, result.activityTitle)
  const headerLine = Number.isFinite(usableWidth)
    ? joinHeader(left, right, usableWidth)
    : (right ? left + SEP + right : left)

  const rows: string[] = [...wrapLine(headerLine, usableWidth, SEP)]
  const headerRowCount = rows.length

  for (const line of result.session) {
    rows.push(...wrapLine(line, usableWidth, SEP))
  }
  for (const line of result.activity) {
    rows.push(...wrapLine(line, usableWidth, SEP))
  }

  // Frame the body with box-drawing rules when there's content: ┌── on top and
  // └── on bottom. The │ gutter on each row connects cleanly to both corners.
  if (rows.length > headerRowCount) {
    const widest = Math.max(...rows.map(vlen))
    const ruleWidth = Number.isFinite(usableWidth) ? Math.min(usableWidth, widest) : widest
    const dashes = RULE_CHAR.repeat(Math.max(0, ruleWidth - 1))
    rows.splice(headerRowCount, 0, rule("┌" + dashes))
    rows.push(rule("└" + dashes))
  }

  return rows.map(row => LEFT_PAD + nbsp(row)).join("\n")
}
