import { describe, expect, test } from "bun:test"
import { mapRawToStdinData } from "../../src/parsing/stdin"

describe("mapRawToStdinData", () => {
  test("maps complete raw input correctly", () => {
    const raw = {
      model: { display_name: "Opus" },
      context_window: { used_percentage: 45, context_window_size: 200000 },
      cost: { total_cost_usd: 1.50, total_duration_ms: 120000, total_lines_added: 100, total_lines_removed: 50 },
      workspace: { current_dir: "/home/user/project" },
      session_name: "my-session",
      rate_limits: {
        five_hour: { used_percentage: 30.7, resets_at: 1700000000 },
        seven_day: { used_percentage: 10.2, resets_at: 1700100000 },
      },
      vim: { mode: "NORMAL" },
      worktree: { name: "feature-branch" },
      transcript_path: "/tmp/transcript.jsonl",
    }
    const result = mapRawToStdinData(raw)

    expect(result.model).toBe("Opus")
    expect(result.contextPercent).toBe(45)
    expect(result.cost).toBe(1.50)
    expect(result.durationMs).toBe(120000)
    expect(result.linesAdded).toBe(100)
    expect(result.linesRemoved).toBe(50)
    expect(result.cwd).toBe("/home/user/project")
    expect(result.contextWindowSize).toBe(200000)
    expect(result.sessionName).toBe("my-session")
    expect(result.rateLimit5h).toEqual({ pct: 31, resetsAt: 1700000000 })
    expect(result.rateLimit7d).toEqual({ pct: 10, resetsAt: 1700100000 })
    expect(result.vimMode).toBe("NORMAL")
    expect(result.worktree).toBe("feature-branch")
    expect(result.transcriptPath).toBe("/tmp/transcript.jsonl")
  })

  test("applies defaults for missing fields", () => {
    const result = mapRawToStdinData({})
    expect(result.model).toBe("Unknown")
    expect(result.contextPercent).toBe(0)
    expect(result.cost).toBe(0)
    expect(result.durationMs).toBe(0)
    expect(result.linesAdded).toBe(0)
    expect(result.linesRemoved).toBe(0)
    expect(result.cwd).toBe("")
    expect(result.contextWindowSize).toBeNull()
    expect(result.sessionName).toBeNull()
    expect(result.rateLimit5h).toBeNull()
    expect(result.rateLimit7d).toBeNull()
    expect(result.vimMode).toBeNull()
    expect(result.worktree).toBeNull()
    expect(result.transcriptPath).toBeNull()
  })

  test("falls back to raw.cwd when workspace.current_dir is missing", () => {
    const result = mapRawToStdinData({ cwd: "/fallback/dir" })
    expect(result.cwd).toBe("/fallback/dir")
  })

  test("rounds rate limit percentages", () => {
    const raw = {
      rate_limits: {
        five_hour: { used_percentage: 33.33 },
        seven_day: { used_percentage: 66.67 },
      },
    }
    const result = mapRawToStdinData(raw)
    expect(result.rateLimit5h!.pct).toBe(33)
    expect(result.rateLimit7d!.pct).toBe(67)
  })

  test("returns null rate limits when used_percentage is missing", () => {
    const raw = {
      rate_limits: {
        five_hour: { resets_at: 123 },
        seven_day: {},
      },
    }
    const result = mapRawToStdinData(raw)
    expect(result.rateLimit5h).toBeNull()
    expect(result.rateLimit7d).toBeNull()
  })
})
