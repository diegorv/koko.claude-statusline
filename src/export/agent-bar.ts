// Optional snapshot of the session for a terminal-side "agent bar" (e.g. the
// kitty title bar). When AGENT_BAR_DIR is set and the statusline runs inside a
// kitty window (KITTY_WINDOW_ID), each invocation writes
// <AGENT_BAR_DIR>/<KITTY_WINDOW_ID>.json with a small, agent-agnostic summary.
// Other agents can write the same schema, so the bar does not care who wrote it.

import { chmodSync, mkdirSync, renameSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import type { StdinData } from "../parsing/stdin.ts"
import type { EffortLevel } from "../collection/config.ts"

export interface AgentBarSnapshot {
  agent: "claude"
  model: string
  effort: EffortLevel | null
  /** Context window usage, rounded to a whole percent. */
  context_pct: number
  context_tokens: number | null
  cost_usd: number
  session_name: string | null
  /** Milliseconds since the epoch. */
  updated_at: number
}

/**
 * Maps the parsed session data into the agent-bar schema.
 * @param data - Parsed Claude Code stdin.
 * @param effort - Resolved /effort level, or null when unset.
 * @param now - Timestamp for `updated_at` (injectable for tests).
 */
export function buildSnapshot(data: StdinData, effort: EffortLevel | null, now = Date.now()): AgentBarSnapshot {
  return {
    agent: "claude",
    model: data.model,
    effort,
    context_pct: Math.round(data.contextPercent),
    context_tokens: data.contextTokens,
    cost_usd: data.cost,
    session_name: data.sessionName,
    updated_at: now,
  }
}

/**
 * Writes the snapshot when AGENT_BAR_DIR and a numeric KITTY_WINDOW_ID are set;
 * otherwise does nothing. Never throws — the statusline must render regardless.
 * The file is written to a temp name and renamed, so readers never see half a file.
 * @param env - Environment (process.env in production).
 * @param data - Parsed Claude Code stdin.
 * @param effort - Resolved /effort level, or null when unset.
 */
export function exportAgentBar(env: Record<string, string | undefined>, data: StdinData, effort: EffortLevel | null): void {
  const dir = env.AGENT_BAR_DIR
  const windowId = env.KITTY_WINDOW_ID
  // Numeric only: the id becomes a file name, so nothing like "../x" gets through
  if (!dir || !windowId || !/^\d+$/.test(windowId)) return
  try {
    mkdirSync(dir, { recursive: true, mode: 0o700 })
    chmodSync(dir, 0o700)
    const path = join(dir, `${windowId}.json`)
    const tmp = `${path}.${process.pid}.tmp`
    writeFileSync(tmp, JSON.stringify(buildSnapshot(data, effort)), { mode: 0o600 })
    renameSync(tmp, path)
  } catch {}
}
