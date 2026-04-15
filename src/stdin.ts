// Parse JSON from Claude Code stdin

export interface StdinData {
  model: string
  ctx: number
  cost: number
  dur: number
  added: number
  removed: number
  cwd: string
  rl5h: { pct: number; resetsAt: number } | null
  rl7d: { pct: number; resetsAt: number } | null
  vimMode: string | null
  worktree: string | null
}

export async function parseStdin(): Promise<StdinData> {
  let raw: any
  try {
    raw = await Bun.stdin.json()
  } catch {
    process.exit(0)
  }

  const rl5h = raw.rate_limits?.five_hour
  const rl7d = raw.rate_limits?.seven_day

  return {
    model:    raw.model?.display_name ?? "Unknown",
    ctx:      raw.context_window?.used_percentage ?? 0,
    cost:     raw.cost?.total_cost_usd ?? 0,
    dur:      raw.cost?.total_duration_ms ?? 0,
    added:    raw.cost?.total_lines_added ?? 0,
    removed:  raw.cost?.total_lines_removed ?? 0,
    cwd:      raw.workspace?.current_dir ?? raw.cwd ?? "",
    rl5h:     rl5h?.used_percentage != null
              ? { pct: Math.round(rl5h.used_percentage), resetsAt: rl5h.resets_at ?? 0 }
              : null,
    rl7d:     rl7d?.used_percentage != null
              ? { pct: Math.round(rl7d.used_percentage), resetsAt: rl7d.resets_at ?? 0 }
              : null,
    vimMode:  raw.vim?.mode ?? null,
    worktree: raw.worktree?.name ?? null,
  }
}
