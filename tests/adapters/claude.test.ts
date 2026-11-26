import { describe, expect, test } from "bun:test"
import { mapClaudeInput } from "../../src/adapters/claude.ts"

describe("mapClaudeInput", () => {
  test("preserves reported zeros and uses the session ID or transcript filename for diagnostics", () => {
    const data = mapClaudeInput({ cost: { total_cost_usd: 0, total_duration_ms: 0 }, session_id: "session", transcript_path: "/tmp/other.jsonl" })
    expect(data.cost).toBe(0)
    expect(data.durationMs).toBe(0)
    expect(data.sessionId).toBe("session")
    expect(mapClaudeInput({ transcript_path: "/tmp/fallback.jsonl" }).sessionId).toBe("fallback")
    expect(mapClaudeInput({}).sessionId).toBeNull()
  })
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
      output_style: { name: "explanatory" },
    }
    const result = mapClaudeInput(raw)

    expect(result.model).toBe("Opus")
    expect(result.contextPercent).toBe(45)
    expect(result.cost).toBe(1.50)
    expect(result.durationMs).toBe(120000)
    expect(result.linesAdded).toBe(100)
    expect(result.linesRemoved).toBe(50)
    expect(result.cwd).toBe("/home/user/project")
    expect(result.contextWindowSize).toBe(200000)
    expect(result.sessionName).toBe("my-session")
    expect(result.rateLimits[0]).toEqual({ label: "5h", pct: 31, resetsAt: 1700000000, remaining: null, disabled: false })
    expect(result.rateLimits[1]).toEqual({ label: "7d", pct: 10, resetsAt: 1700100000, remaining: null, disabled: false })
    expect(result.vimMode).toBe("NORMAL")
    expect(result.worktree).toBe("feature-branch")
    expect(result.transcriptPath).toBe("/tmp/transcript.jsonl")
    expect(result.outputStyle).toBe("explanatory")
  })

  test("applies defaults for missing fields", () => {
    const result = mapClaudeInput({})
    expect(result.model).toBe("Unknown")
    expect(result.contextPercent).toBe(0)
    expect(result.cost).toBeNull()
    expect(result.durationMs).toBeNull()
    expect(result.linesAdded).toBe(0)
    expect(result.linesRemoved).toBe(0)
    expect(result.cwd).toBe("")
    expect(result.contextWindowSize).toBeNull()
    expect(result.sessionName).toBeNull()
    expect(result.rateLimits).toEqual([])
    expect(result.vimMode).toBeNull()
    expect(result.worktree).toBeNull()
    expect(result.transcriptPath).toBeNull()
    expect(result.outputStyle).toBeNull()
  })

  test("falls back to raw.cwd when workspace.current_dir is missing", () => {
    const result = mapClaudeInput({ cwd: "/fallback/dir" })
    expect(result.cwd).toBe("/fallback/dir")
  })

  test("rounds rate limit percentages", () => {
    const raw = {
      rate_limits: {
        five_hour: { used_percentage: 33.33 },
        seven_day: { used_percentage: 66.67 },
      },
    }
    const result = mapClaudeInput(raw)
    expect(result.rateLimits[0].pct).toBe(33)
    expect(result.rateLimits[1].pct).toBe(67)
  })

  test("sums contextTokens from current_usage (input + cache_creation + cache_read)", () => {
    const raw = {
      context_window: {
        current_usage: {
          input_tokens: 100,
          cache_creation_input_tokens: 50,
          cache_read_input_tokens: 25,
          output_tokens: 9999,  // must be excluded per Claude Code's formula
        },
      },
    }
    expect(mapClaudeInput(raw).contextTokens).toBe(175)
  })

  test("contextTokens is null when current_usage is absent", () => {
    expect(mapClaudeInput({}).contextTokens).toBeNull()
    expect(mapClaudeInput({ context_window: { used_percentage: 40 } }).contextTokens).toBeNull()
  })

  test("keeps the model id, which settings are keyed by", () => {
    expect(mapClaudeInput({ model: { id: "claude-opus-5-5", display_name: "Opus" } }).modelId).toBe("claude-opus-5-5")
    expect(mapClaudeInput({}).modelId).toBe("")
  })

  test("compacts model display name '(1M context)' suffix to '1M'", () => {
    expect(mapClaudeInput({ model: { display_name: "Opus 4.7 (1M context)" } }).model).toBe("Opus 4.7 1M")
    expect(mapClaudeInput({ model: { display_name: "Sonnet 4.6 (200k context)" } }).model).toBe("Sonnet 4.6 200k")
    expect(mapClaudeInput({ model: { display_name: "Opus" } }).model).toBe("Opus")
  })

  test("returns null rate limits when used_percentage is missing", () => {
    const raw = {
      rate_limits: {
        five_hour: { resets_at: 123 },
        seven_day: {},
      },
    }
    const result = mapClaudeInput(raw)
    expect(result.rateLimits).toEqual([])
  })
})
