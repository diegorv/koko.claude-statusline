// Parse JSON from Claude Code stdin

export interface StdinData {
  model: string
  contextPercent: number
  cost: number
  durationMs: number
  linesAdded: number
  linesRemoved: number
  cwd: string
  contextWindowSize: number | null
  sessionName: string | null
  rateLimit5h: { pct: number; resetsAt: number } | null
  rateLimit7d: { pct: number; resetsAt: number } | null
  vimMode: string | null
  worktree: string | null
  transcriptPath: string | null
}

/**
 * Maps a raw JSON object from Claude Code stdin into a normalized StdinData structure.
 * Extracts and transforms nested fields with safe defaults for missing values.
 * @param raw - Raw parsed JSON from stdin.
 * @returns Normalized StdinData object.
 */
export function mapRawToStdinData(raw: any): StdinData {
  const rateLimitFiveHour = raw.rate_limits?.five_hour
  const rateLimitSevenDay = raw.rate_limits?.seven_day

  return {
    model:    raw.model?.display_name ?? "Unknown",
    contextPercent: raw.context_window?.used_percentage ?? 0,
    cost:     raw.cost?.total_cost_usd ?? 0,
    durationMs: raw.cost?.total_duration_ms ?? 0,
    linesAdded:  raw.cost?.total_lines_added ?? 0,
    linesRemoved: raw.cost?.total_lines_removed ?? 0,
    cwd:      raw.workspace?.current_dir ?? raw.cwd ?? "",
    contextWindowSize: raw.context_window?.context_window_size ?? null,
    sessionName: raw.session_name ?? null,
    rateLimit5h: rateLimitFiveHour?.used_percentage != null
              ? { pct: Math.round(rateLimitFiveHour.used_percentage), resetsAt: rateLimitFiveHour.resets_at ?? 0 }
              : null,
    rateLimit7d: rateLimitSevenDay?.used_percentage != null
              ? { pct: Math.round(rateLimitSevenDay.used_percentage), resetsAt: rateLimitSevenDay.resets_at ?? 0 }
              : null,
    vimMode:  raw.vim?.mode ?? null,
    worktree: raw.worktree?.name ?? null,
    transcriptPath: raw.transcript_path ?? null,
  }
}

/**
 * Reads and parses JSON from Bun stdin, returning a normalized StdinData object.
 * Exits the process silently if stdin cannot be parsed.
 * @returns Promise resolving to the parsed StdinData.
 */
export async function parseStdin(): Promise<StdinData> {
  let raw: any
  try {
    raw = await Bun.stdin.json()
  } catch {
    process.exit(0)
  }
  return mapRawToStdinData(raw)
}
