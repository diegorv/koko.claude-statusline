// Claude Code owns these local configuration and transcript formats.
import { basename } from "node:path"
import type { SessionData } from "../../core/model.ts"
import type { AgentSnapshot } from "../../core/snapshot.ts"
import { getConfigCounts } from "./config.ts"
import { parseTranscript } from "./transcript.ts"
import { detectSkipPermissions } from "./parent-process.ts"
import { getCavemanState } from "./caveman.ts"
import { cavemanAnnotation } from "./caveman-badge.ts"

/** Collapses "(1M context)" style suffixes into a bare size (e.g. "Opus 4.7 (1M context)" → "Opus 4.7 1M"). */
function compactModelName(name: string): string {
  return name.replace(/\s*\(\s*([0-9.]+[kKmM])\s+context\s*\)/i, " $1")
}

export function mapClaudeInput(raw: any): SessionData {
  const rateLimitFiveHour = raw.rate_limits?.five_hour
  const rateLimitSevenDay = raw.rate_limits?.seven_day

  return {
    agent: "claude",
    effortLevel: null,
    costEstimated: null,
    state: null,
    model:    compactModelName(raw.model?.display_name ?? "Unknown"),
    contextPercent: raw.context_window?.used_percentage ?? 0,
    contextTokens: (() => {
      const u = raw.context_window?.current_usage
      if (!u) return null
      return (u.input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0) + (u.cache_read_input_tokens ?? 0)
    })(),
    cost:     raw.cost?.total_cost_usd ?? null,
    durationMs: raw.cost?.total_duration_ms ?? null,
    linesAdded:  raw.cost?.total_lines_added ?? 0,
    linesRemoved: raw.cost?.total_lines_removed ?? 0,
    cwd:      raw.workspace?.current_dir ?? raw.cwd ?? "",
    contextWindowSize: raw.context_window?.context_window_size ?? null,
    sessionName: raw.session_name ?? null,
    sessionId: raw.session_id || (raw.transcript_path ? basename(raw.transcript_path, ".jsonl") : null),
    rateLimits: [
      ...(rateLimitFiveHour?.used_percentage != null
        ? [{ label: "5h", pct: Math.round(rateLimitFiveHour.used_percentage), resetsAt: rateLimitFiveHour.resets_at ?? 0, remaining: null, disabled: false }] : []),
      ...(rateLimitSevenDay?.used_percentage != null
        ? [{ label: "7d", pct: Math.round(rateLimitSevenDay.used_percentage), resetsAt: rateLimitSevenDay.resets_at ?? 0, remaining: null, disabled: false }] : []),
    ],
    vimMode:  raw.vim?.mode ?? null,
    worktree: raw.worktree?.name ?? null,
    outputStyle: raw.output_style?.name ?? null,
  }
}

type ClaudeInput = Record<string, unknown> & { model?: { id?: string }; transcript_path?: string }

export const claudeAdapter = {
  id: "claude" as const,
  read(raw: ClaudeInput) {
    const data = mapClaudeInput(raw)
    const config = data.cwd ? getConfigCounts(data.cwd, raw.model?.id ?? "") : null
    data.effortLevel = config?.effortLevel ?? null
    const caveman = cavemanAnnotation(getCavemanState())
    const transcript = raw.transcript_path ? parseTranscript(raw.transcript_path) : null
    const snapshot: AgentSnapshot = {
      data,
      config: config ? {
        instructionFiles: [{ name: "CLAUDE.md", count: config.claudeMd }],
        mcps: config.mcps, hooks: config.hooks, rules: config.rules,
      } : null,
      tokenTotals: transcript?.tokenTotals ?? null,
      activity: transcript?.activity ?? null,
      skipPermissions: detectSkipPermissions(),
      headerAnnotations: caveman ? [caveman] : [],
    }
    return { snapshot, stabilityKey: raw.transcript_path ?? null }
  },
}
