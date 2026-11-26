// Claude Code owns these local configuration and transcript formats.
import { basename } from "node:path"
import type { SessionData } from "../model.ts"
import type { AgentAdapter } from "./types.ts"
import { getConfigCounts } from "../collection/config.ts"
import { parseTranscript } from "../parsing/transcript.ts"
import { detectSkipPermissions } from "../collection/parent-process.ts"
import { getCavemanState } from "../collection/caveman.ts"

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
    terminalWidth: null,
    rightMargin: 16,
    frameWidth: "content",
    costEstimated: false,
    state: null,
    model:    compactModelName(raw.model?.display_name ?? "Unknown"),
    modelId:  raw.model?.id ?? "",
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
    transcriptPath: raw.transcript_path ?? null,
    outputStyle: raw.output_style?.name ?? null,
  }
}


export const claudeAdapter: AgentAdapter = {
  id: "claude",
  read(raw) {
    const data = mapClaudeInput(raw)
    const config = data.cwd ? getConfigCounts(data.cwd, data.modelId) : null
    data.effortLevel = config?.effortLevel ?? null
    return {
      data,
      config: config ? {
        instructionFiles: [{ name: "CLAUDE.md", count: config.claudeMd }],
        mcps: config.mcps, hooks: config.hooks, rules: config.rules,
      } : null,
      activity: data.transcriptPath ? parseTranscript(data.transcriptPath) : null,
      skipPermissions: detectSkipPermissions(),
      caveman: getCavemanState(),
    }
  },
}
