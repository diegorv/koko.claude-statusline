import { afterEach, beforeEach, describe, expect, setSystemTime, test } from "bun:test"
import { composeRows as renderSnapshot } from "../../src/ui/rows.ts"
import type { SessionData } from "../../src/core/model.ts"
import type { GitInfo } from "../../src/core/workspace.ts"
import type { ActivityData } from "../../src/core/model.ts"

// Fixtures exercise the shared snapshot interface used by both hosts.
function render(data: SessionData, git: GitInfo | null, config: import("../../src/core/model.ts").ConfigSummary | null, activity: ActivityData | null = null) {
  return renderSnapshot({ data, config, activity, skipPermissions: false, headerAnnotations: [] }, { git, worktrunk: null })
}

const MINIMAL_DATA: SessionData = {
  agent: "claude", effortLevel: null, costEstimated: false, state: null,
  model: "Opus", contextPercent: 50, contextTokens: null, cost: 0.05, durationMs: 60000,
  linesAdded: 0, linesRemoved: 0, cwd: "/tmp", contextWindowSize: null,
  sessionName: null, sessionId: null, rateLimits: [],
  vimMode: null, worktree: null, outputStyle: null,
}

const CLEAN_GIT: GitInfo = {
  repo: "myrepo", branch: "main", dirty: false,
  staged: 0, modified: 0, untracked: 0, ahead: 0, behind: 0,
  sha: "", isFork: false, worktree: "",
}

const EMPTY_TRANSCRIPT: ActivityData = {
  tools: new Map(), runningTools: [], agents: [],
  todos: { total: 0, completed: 0, current: null },
  mcpStatus: { ok: new Set(), errored: new Set() },
  lastAssistantTimestamp: null,
  tokenTotals: { input: 0, output: 0, cacheCreate: 0, cacheRead: 0 },
  assistantSamples: [],
}

describe("render", () => {
  beforeEach(() => setSystemTime(new Date("2026-11-26T12:00:00Z")))
  afterEach(() => setSystemTime())

  test("returns empty arrays with minimal data and no git/config/transcript", () => {
    const result = render(MINIMAL_DATA, null, null, null)
    expect(result.session).toEqual([])
    expect(result.activity).toEqual([])
    expect(result.activityTitle).toBe("")
  })

  test("session includes git info when provided", () => {
    const result = render(MINIMAL_DATA, CLEAN_GIT, null, null)
    expect(result.session.length).toBe(1)
    expect(result.session[0]).toContain("main")
  })

  test("session includes rate limits when provided", () => {
    const data = { ...MINIMAL_DATA, rateLimits: [{ label: "5h", pct: 50, resetsAt: 0, remaining: null, disabled: false }] }
    const result = render(data, null, null, null)
    expect(result.session.length).toBe(1)
    expect(result.session[0]).toContain("5h")
    expect(result.session[0]).toContain("50%")
  })

  test("session emits separate rows for git and rate limits", () => {
    const data = { ...MINIMAL_DATA, rateLimits: [{ label: "5h", pct: 30, resetsAt: 0, remaining: null, disabled: false }] }
    const result = render(data, CLEAN_GIT, null, null)
    expect(result.session.length).toBe(2)
    expect(result.session[0]).toContain("main")
    expect(result.session[1]).toContain("5h")
  })

  test("session emits one row when only git or only rate limits", () => {
    const onlyGit = render(MINIMAL_DATA, CLEAN_GIT, null, null)
    expect(onlyGit.session.length).toBe(1)

    const onlyRate = render({ ...MINIMAL_DATA, rateLimits: [{ label: "5h", pct: 10, resetsAt: 0, remaining: null, disabled: false }] }, null, null, null)
    expect(onlyRate.session.length).toBe(1)
  })

  test("rate limit row groups 5h and 7d together", () => {
    const data = {
      ...MINIMAL_DATA,
      rateLimits: [{ label: "5h", pct: 30, resetsAt: 0, remaining: null, disabled: false }, { label: "7d", pct: 50, resetsAt: 0, remaining: null, disabled: false }],
    }
    const result = render(data, null, null, null)
    expect(result.session.length).toBe(1)
    expect(result.session[0]).toContain("5h")
    expect(result.session[0]).toContain("7d")
  })

  test("token breakdown joins the consumption row when transcript has totals", () => {
    const transcript: ActivityData = {
      ...EMPTY_TRANSCRIPT,
      tokenTotals: { input: 1200, output: 300, cacheCreate: 0, cacheRead: 0 },
    }
    const result = render(MINIMAL_DATA, null, null, transcript)
    expect(result.session.length).toBe(1)
    expect(result.session[0]).toContain("↑")
    expect(result.session[0]).toContain("↓")
  })

  test("token breakdown shares its row with rate limits", () => {
    const data = { ...MINIMAL_DATA, rateLimits: [{ label: "5h", pct: 30, resetsAt: 0, remaining: null, disabled: false }] }
    const transcript: ActivityData = {
      ...EMPTY_TRANSCRIPT,
      tokenTotals: { input: 1000, output: 200, cacheCreate: 0, cacheRead: 0 },
    }
    const result = render(data, null, null, transcript)
    expect(result.session.length).toBe(1)
    expect(result.session[0]).toContain("↑")
    expect(result.session[0]).toContain("5h")
  })

  test("output speed joins the consumption row when samples are fresh and spread", () => {
    const now = Date.now()
    const transcript: ActivityData = {
      ...EMPTY_TRANSCRIPT,
      tokenTotals: { input: 100, output: 1400, cacheCreate: 0, cacheRead: 0 },
      // Δ400 output tokens in 4s = 100 tok/s. Most recent sample within freshness window.
      assistantSamples: [
        { t: now - 5000, output: 1000 },
        { t: now - 1000, output: 1400 },
      ],
    }
    const result = render(MINIMAL_DATA, null, null, transcript)
    expect(result.session.length).toBe(1)
    expect(result.session[0]).toContain("tok/s")
  })

  test("output speed is omitted when samples are stale", () => {
    const transcript: ActivityData = {
      ...EMPTY_TRANSCRIPT,
      tokenTotals: { input: 100, output: 1400, cacheCreate: 0, cacheRead: 0 },
      // Both samples are over a minute old — output speed gates out.
      assistantSamples: [
        { t: Date.now() - 120_000, output: 1000 },
        { t: Date.now() - 60_000, output: 1400 },
      ],
    }
    const result = render(MINIMAL_DATA, null, null, transcript)
    expect(result.session.join(" ")).not.toContain("tok/s")
  })

  test("activity emits separate rows for tools, agents, todos", () => {
    const transcript: ActivityData = {
      ...EMPTY_TRANSCRIPT,
      tools: new Map([["read", 5]]),
      agents: [{ type: "Explore", description: "x", running: false, elapsed: 1000 }],
      todos: { total: 3, completed: 1, current: "Fix bug" },
    }
    const result = render(MINIMAL_DATA, null, null, transcript)
    expect(result.activity.length).toBe(3)
    expect(result.activity[0]).toContain("read")
    expect(result.activity[1]).toContain("Explore")
    expect(result.activity[2]).toContain("Fix bug")
  })

  test("activity includes tools from transcript", () => {
    const transcript: ActivityData = {
      ...EMPTY_TRANSCRIPT,
      tools: new Map([["read", 5], ["edit", 3]]),
    }
    const result = render(MINIMAL_DATA, null, null, transcript)
    expect(result.activity.length).toBe(1)
    expect(result.activity[0]).toContain("read")
    expect(result.activity[0]).toContain("×5")
  })

  test("activity includes agents from transcript", () => {
    const transcript: ActivityData = {
      ...EMPTY_TRANSCRIPT,
      agents: [{ type: "Explore", description: "search", running: false, elapsed: 5000 }],
    }
    const result = render(MINIMAL_DATA, null, null, transcript)
    expect(result.activity.length).toBe(1)
    expect(result.activity[0]).toContain("Explore")
  })

  test("activity includes todo progress from transcript", () => {
    const transcript: ActivityData = {
      ...EMPTY_TRANSCRIPT,
      todos: { total: 3, completed: 1, current: "Fix bug" },
    }
    const result = render(MINIMAL_DATA, null, null, transcript)
    expect(result.activity.length).toBe(1)
    expect(result.activity[0]).toContain("Fix bug")
  })

  test("activity is empty when transcript has no tools/agents/todos", () => {
    const result = render(MINIMAL_DATA, null, null, EMPTY_TRANSCRIPT)
    expect(result.activity).toEqual([])
  })

  test("activityTitle includes config counts", () => {
    const config = { instructionFiles: [{ name: "CLAUDE.md", count: 2 }], mcps: 3, hooks: 1, rules: 0 }
    const result = render(MINIMAL_DATA, null, config, null)
    expect(result.activityTitle).toContain("2 CLAUDE.md")
    expect(result.activityTitle).toContain("3 MCPs")
    expect(result.activityTitle).toContain("1 hooks")
  })

  test("activityTitle includes session name", () => {
    const data = { ...MINIMAL_DATA, sessionName: "my-session" }
    const result = render(data, null, null, null)
    expect(result.activityTitle).toContain("my-session")
  })
})
