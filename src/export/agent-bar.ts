// Optional snapshot of the session for a terminal-side "agent bar" (e.g. the
// kitty title bar). When AGENT_BAR_DIR is set, each invocation writes a small,
// agent-agnostic summary to:
//   <AGENT_BAR_DIR>/<KITTY_WINDOW_ID>.json        inside a kitty window
//   <AGENT_BAR_DIR>/herdr-<HERDR_PANE_ID>.json    inside a herdr pane (":" → "_")
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
 * File names (without directory) the snapshot goes to, one per terminal
 * context found in the environment. Ids become file names, so anything that
 * could escape the directory (like "../x") is rejected.
 * @param env - Environment (process.env in production).
 */
function snapshotNames(env: Record<string, string | undefined>): string[] {
  const names: string[] = []
  const windowId = env.KITTY_WINDOW_ID
  if (windowId && /^\d+$/.test(windowId)) names.push(`${windowId}.json`)
  const paneId = env.HERDR_PANE_ID
  if (paneId && /^[A-Za-z0-9_:-]+$/.test(paneId)) names.push(`herdr-${paneId.replaceAll(":", "_")}.json`)
  return names
}

/**
 * Writes the snapshot when AGENT_BAR_DIR is set and the statusline runs inside
 * a kitty window (numeric KITTY_WINDOW_ID) and/or a herdr pane (HERDR_PANE_ID);
 * otherwise does nothing. Never throws — the statusline must render regardless.
 * Each file is written to a temp name and renamed, so readers never see half a file.
 * @param env - Environment (process.env in production).
 * @param data - Parsed Claude Code stdin.
 * @param effort - Resolved /effort level, or null when unset.
 */
export function exportAgentBar(env: Record<string, string | undefined>, data: StdinData, effort: EffortLevel | null): void {
  const dir = env.AGENT_BAR_DIR
  const names = snapshotNames(env)
  if (!dir || names.length === 0) return
  try {
    mkdirSync(dir, { recursive: true, mode: 0o700 })
    chmodSync(dir, 0o700)
    const body = JSON.stringify(buildSnapshot(data, effort))
    for (const name of names) {
      const path = join(dir, name)
      const tmp = `${path}.${process.pid}.tmp`
      writeFileSync(tmp, body, { mode: 0o600 })
      renameSync(tmp, path)
    }
  } catch {}
}
