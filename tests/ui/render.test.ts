import { describe, expect, test } from "bun:test"
import { render } from "../../src/ui/render"
import type { StdinData } from "../../src/parsing/stdin"
import type { GitInfo } from "../../src/collection/git"
import type { TranscriptData } from "../../src/parsing/transcript"

const MINIMAL_DATA: StdinData = {
  model: "Opus", contextPercent: 50, contextTokens: null, cost: 0.05, durationMs: 60000,
  linesAdded: 0, linesRemoved: 0, cwd: "/tmp", contextWindowSize: null,
  sessionName: null, rateLimit5h: null, rateLimit7d: null,
  vimMode: null, worktree: null, transcriptPath: null,
}

const CLEAN_GIT: GitInfo = {
  repo: "myrepo", branch: "main", dirty: false,
  staged: 0, modified: 0, untracked: 0, ahead: 0, behind: 0,
}

const EMPTY_TRANSCRIPT: TranscriptData = {
  tools: new Map(), runningTools: [], agents: [],
  todos: { total: 0, completed: 0, current: null },
  mcpStatus: { ok: new Set(), errored: new Set() },
}

describe("render", () => {
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
    const data = { ...MINIMAL_DATA, rateLimit5h: { pct: 50, resetsAt: 0 } }
    const result = render(data, null, null, null)
    expect(result.session.length).toBe(1)
    expect(result.session[0]).toContain("5h")
    expect(result.session[0]).toContain("50%")
  })

  test("session emits separate rows for git and rate limits", () => {
    const data = { ...MINIMAL_DATA, rateLimit5h: { pct: 30, resetsAt: 0 } }
    const result = render(data, CLEAN_GIT, null, null)
    expect(result.session.length).toBe(2)
    expect(result.session[0]).toContain("main")
    expect(result.session[1]).toContain("5h")
  })

  test("session emits one row when only git or only rate limits", () => {
    const onlyGit = render(MINIMAL_DATA, CLEAN_GIT, null, null)
    expect(onlyGit.session.length).toBe(1)

    const onlyRate = render({ ...MINIMAL_DATA, rateLimit5h: { pct: 10, resetsAt: 0 } }, null, null, null)
    expect(onlyRate.session.length).toBe(1)
  })

  test("rate limit row groups 5h and 7d together", () => {
    const data = {
      ...MINIMAL_DATA,
      rateLimit5h: { pct: 30, resetsAt: 0 },
      rateLimit7d: { pct: 50, resetsAt: 0 },
    }
    const result = render(data, null, null, null)
    expect(result.session.length).toBe(1)
    expect(result.session[0]).toContain("5h")
    expect(result.session[0]).toContain("7d")
  })

  test("activity emits separate rows for tools, agents, todos", () => {
    const transcript: TranscriptData = {
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
    const transcript: TranscriptData = {
      ...EMPTY_TRANSCRIPT,
      tools: new Map([["read", 5], ["edit", 3]]),
    }
    const result = render(MINIMAL_DATA, null, null, transcript)
    expect(result.activity.length).toBe(1)
    expect(result.activity[0]).toContain("read")
    expect(result.activity[0]).toContain("×5")
  })

  test("activity includes agents from transcript", () => {
    const transcript: TranscriptData = {
      ...EMPTY_TRANSCRIPT,
      agents: [{ type: "Explore", description: "search", running: false, elapsed: 5000 }],
    }
    const result = render(MINIMAL_DATA, null, null, transcript)
    expect(result.activity.length).toBe(1)
    expect(result.activity[0]).toContain("Explore")
  })

  test("activity includes todo progress from transcript", () => {
    const transcript: TranscriptData = {
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
    const config = { claudeMd: 2, mcps: 3, hooks: 1, rules: 0, effortLevel: null }
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
