import { afterEach, beforeEach, describe, expect, setSystemTime, test } from "bun:test"
import { antigravityAdapter, mapAntigravityInput } from "../../../src/agents/antigravity/adapter.ts"
import { buildSnapshot } from "../../../src/export/pane-header.ts"
import { render } from "../../../src/ui/render.ts"
import { renderLines } from "../../../src/ui/lines.ts"
import { vlen } from "../../../src/ui/format.ts"

const payload = {
  product: "antigravity",
  model: { id: "gemini", display_name: "Gemini", effort: "high" },
  workspace: { current_dir: "/project" },
  conversation_title: "Fix tests",
  context_window: {
    used_percentage: 25, context_window_size: 100000,
    current_usage: { input_tokens: 20000, cache_read_input_tokens: 5000, output_tokens: 1000 },
    total_input_tokens: 60000, total_output_tokens: 3000,
  },
  cost: { total_usd: 0.42, estimated: true },
  quota: { "gemini-weekly": { remaining_fraction: 0.75, reset_time: "2030-01-01T00:00:00Z" } },
  subagents: [{ name: "explorer", role: "research", status: "running" }, { name: "reviewer", status: "completed" }],
  agent_state: "working",
  terminal_width: 100,
  vim: { mode: "NORMAL" },
}

function output(raw: Record<string, unknown>): string {
  const snapshot = antigravityAdapter.read(raw)
  return renderLines(snapshot.data, render(snapshot, null))
    .replace(/\x1b\[[0-9;]*m/g, "").replaceAll("\u00a0", " ")
}

describe("Antigravity adapter", () => {
  const marginKeys = ["KOKO_STATUSLINE_RIGHT_MARGIN", "CLAUDE_STATUSLINE_RIGHT_MARGIN"] as const
  const originalMargins = marginKeys.map(key => process.env[key])
  beforeEach(() => {
    setSystemTime(new Date("2026-11-26T12:00:00Z"))
    for (const key of marginKeys) delete process.env[key]
  })
  afterEach(() => {
    setSystemTime()
    marginKeys.forEach((key, index) => {
      if (originalMargins[index] === undefined) delete process.env[key]
      else process.env[key] = originalMargins[index]
    })
  })

  test("keeps the four quota buckets on one row when they fit the terminal", () => {
    const raw = {
      terminal_width: 130,
      quota: {
        "3p-5h": { remaining_fraction: 1 },
        "3p-weekly": { remaining_fraction: 1 },
        "gemini-5h": { remaining_fraction: 0.01, reset_in_seconds: 5520 },
        "gemini-weekly": { remaining_fraction: 0.73, reset_in_seconds: 590400 },
      },
    }
    const text = output(raw)
    const quotaRows = text.split("\n").filter(line => /3p-|gemini-/.test(line))
    expect(quotaRows).toHaveLength(1)
    expect(vlen(quotaRows[0])).toBeLessThanOrEqual(130)
    const withHeader = output({ ...raw, cost: { total_usd: 0.42 }, conversation_title: "Explain the factorial function" })
    expect(withHeader.split("\n").filter(line => /3p-|gemini-/.test(line))).toHaveLength(1)

    // Manual margins still work, including the legacy variable and KOKO precedence.
    process.env.CLAUDE_STATUSLINE_RIGHT_MARGIN = "16"
    expect(output(raw).split("\n").filter(line => /3p-|gemini-/.test(line))).toHaveLength(2)
    process.env.KOKO_STATUSLINE_RIGHT_MARGIN = "0"
    expect(output(raw).split("\n").filter(line => /3p-|gemini-/.test(line))).toHaveLength(1)
  })

  test("maps documented fields and exports the correct provider and cost semantics", () => {
    const data = mapAntigravityInput(payload)
    expect(data.agent).toBe("antigravity")
    expect(data.effortLevel).toBe("high")
    expect(data.cwd).toBe("/project")
    expect(data.contextTokens).toBeNull()
    expect(data.sessionName).toBe("Fix tests")
    expect(data.rateLimits[0]).toEqual({ label: "gemini-weekly", pct: 25, resetsAt: 1893456000, remaining: null, disabled: false })
    expect(buildSnapshot(data, data.effortLevel, 123)).toEqual({
      agent: "antigravity", model: "Gemini", effort: "high", context_pct: 25,
      context_tokens: null, cost_usd: 0.42, cost_estimated: true,
      session_name: "Fix tests", updated_at: 123,
    })
  })

  test("extends the frame to the available width independently of content and header annotations", () => {
    for (const header of [{}, { conversation_title: "Explain the factorial function", cost: { total_usd: 0.42 } }]) {
      const text = output({ terminal_width: 130, agent_state: "idle", ...header })
      const frame = text.split("\n").filter(line => /[┌├└]/.test(line))
      expect(frame).toHaveLength(2)
      for (const line of frame) expect(vlen(line)).toBe(130)
    }
    // Explicit margins still reduce the available width.
    process.env.KOKO_STATUSLINE_RIGHT_MARGIN = "10"
    const frame = output({ terminal_width: 130, agent_state: "idle" }).split("\n").filter(line => /[┌├└]/.test(line))
    for (const line of frame) expect(vlen(line)).toBe(120)
  })

  test("renders native quotas, totals, state and subagents without inventing elapsed time", () => {
    const text = output(payload)
    expect(text).toContain("~$0.42")
    expect(text).toContain("effort: high")
    expect(text).toContain("gemini-weekly")
    expect(text).toContain("↑60k")
    expect(text).toContain("↓3k")
    expect(text).toContain("working")
    expect(text).toContain("explorer")
    expect(text).toContain("✓ reviewer")
    expect(text).not.toContain("(0s)")
    expect(text).not.toContain("tok/s")
    expect(text).not.toContain("CLAUDE.md")
    expect(text).not.toContain("⏱")
  })

  test("does not reuse Claude fields or collectors even when supplied", () => {
    const snapshot = antigravityAdapter.read({
      ...payload, transcript_path: "/not/a/claude/transcript.jsonl",
      session_name: "Wrong session", output_style: { name: "Wrong style" },
      rate_limits: { five_hour: { used_percentage: 99 } },
      cost: { total_cost_usd: 99 },
    })
    expect(snapshot.config).toBeNull()
    expect(snapshot.headerBadges).toEqual([])
    expect(snapshot.skipPermissions).toBe(false)
    expect(snapshot.activity?.tools.size).toBe(0)
    expect(snapshot.data.sessionName).toBe("Fix tests")
    expect(snapshot.data.cost).toBeNull()
    expect(snapshot.data.rateLimits).toHaveLength(1)
    expect(snapshot.data.outputStyle).toBeNull()
  })

  test("handles startup and malformed optional fields without false cost or duration", () => {
    const raw = { model: null, context_window: null, cost: null, quota: [], subagents: [null, {}, { status: "unknown" }], terminal_width: -1 }
    const data = mapAntigravityInput(raw)
    expect(data.cost).toBeNull()
    expect(data.durationMs).toBeNull()
    expect(data.contextTokens).toBeNull()
    expect(data.terminalWidth).toBeNull()
    expect(data.rateLimits).toEqual([])
    expect(output(raw)).not.toMatch(/¢|\$|NaN|⏱/)
    expect(buildSnapshot(data, null).cost_usd).toBeNull()
  })

  test("supports absolute balances, disabled buckets and relative reset times", () => {
    const raw = { quota: {
      credits: { remaining_amount: 12, reset_time: "invalid", reset_in_seconds: 60 },
      blocked: { disabled: true },
      empty: { remaining_fraction: 0 },
      full: { remaining_fraction: 2 },
      invalid: { remaining_fraction: "0.5" },
    } }
    const data = mapAntigravityInput(raw, 100000)
    expect(data.rateLimits[0]).toEqual({ label: "credits", pct: null, remaining: 12, resetsAt: 160, disabled: false })
    expect(data.rateLimits[2].pct).toBe(100)
    expect(data.rateLimits[3].pct).toBe(0)
    expect(data.rateLimits).toHaveLength(4)
    expect(output(raw)).toContain("credits 12 left")
    expect(output(raw)).toContain("blocked disabled")
  })

  test("honors supplied terminal width and preserves explicit zero cost", () => {
    const text = output({ ...payload, cost: { total_usd: 0, estimated: false }, terminal_width: 80 })
    expect(text).toContain("0¢")
    expect(text).not.toContain("~0¢")
    for (const line of text.split("\n")) expect(vlen(line)).toBeLessThanOrEqual(80)
  })

  test("does not mix current-turn tokens with the official payload's context percentage", () => {
    // Values from Google's published JSON payload example. current_usage sums
    // to 84,239 input/cache tokens, which is not 14.24% of this context window.
    const raw = { context_window: {
      used_percentage: 14.24, context_window_size: 1048576,
      total_input_tokens: 88244, total_output_tokens: 61074,
      current_usage: { input_tokens: 63382, output_tokens: 346, cache_creation_input_tokens: 0, cache_read_input_tokens: 20857 },
    } }
    const text = output(raw)
    expect(text).toContain("14%")
    expect(text).not.toContain("84k/")
    expect(text).toContain("↑88k")
    expect(text).toContain("↓61k")
    expect(buildSnapshot(mapAntigravityInput(raw), null).context_tokens).toBeNull()
  })

  test("fits narrow frames and wraps many subagents at item boundaries", () => {
    for (const width of [30, 80]) {
      const text = output({
        model: { display_name: "Gemini" }, terminal_width: width,
        agent_state: "working", cost: { total_usd: 2 },
        subagents: Array.from({ length: 8 }, (_, i) => ({ name: `researcher-${i}`, status: "completed" })),
      })
      for (const line of text.split("\n")) expect(vlen(line)).toBeLessThanOrEqual(width)
      for (let i = 0; i < 8; i++) expect(text).toContain(`researcher-${i}`)
    }
  })

  test("uses conversation IDs, with a session ID fallback before a conversation starts", () => {
    expect(mapAntigravityInput({ conversation_id: "conversation", session_id: "session" }).sessionId).toBe("conversation")
    expect(mapAntigravityInput({ conversation_id: "", session_id: "session" }).sessionId).toBe("session")
  })
})
