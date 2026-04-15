import { describe, expect, test } from "bun:test"
import { renderGitStatus } from "../../src/ui/components/git-status"
import { renderWorkspaceInfo } from "../../src/ui/components/workspace-info"
import { renderRateLimit } from "../../src/ui/components/rate-limit"
import { renderRunningTools } from "../../src/ui/components/running-tools"
import { renderCompletedTools } from "../../src/ui/components/completed-tools"
import { renderAgents } from "../../src/ui/components/agents"
import { renderTodos } from "../../src/ui/components/todos"
import { renderActivityTitle } from "../../src/ui/components/activity-title"
import { vlen } from "../../src/ui/format"
import type { GitInfo } from "../../src/collection/git"
import type { StdinData } from "../../src/parsing/stdin"

const MINIMAL_DATA: StdinData = {
  model: "Opus", contextPercent: 50, cost: 0.05, durationMs: 60000,
  linesAdded: 0, linesRemoved: 0, cwd: "/tmp", contextWindowSize: null,
  sessionName: null, rateLimit5h: null, rateLimit7d: null,
  vimMode: null, worktree: null, transcriptPath: null,
}

describe("renderGitStatus", () => {
  test("returns empty string for empty repo", () => {
    const git: GitInfo = { repo: "", branch: "", dirty: false, staged: 0, modified: 0, untracked: 0, ahead: 0, behind: 0 }
    expect(renderGitStatus(git)).toBe("")
  })

  test("renders clean branch", () => {
    const git: GitInfo = { repo: "myrepo", branch: "main", dirty: false, staged: 0, modified: 0, untracked: 0, ahead: 0, behind: 0 }
    const result = renderGitStatus(git)
    expect(result).toContain("main")
    expect(result).not.toContain("*")
  })

  test("renders dirty branch with asterisk", () => {
    const git: GitInfo = { repo: "myrepo", branch: "feat", dirty: true, staged: 1, modified: 2, untracked: 3, ahead: 0, behind: 0 }
    const result = renderGitStatus(git)
    expect(result).toContain("feat")
    expect(result).toContain("*")
    expect(result).toContain("+1")
    expect(result).toContain("~2")
    expect(result).toContain("?3")
  })

  test("renders ahead/behind counts", () => {
    const git: GitInfo = { repo: "myrepo", branch: "main", dirty: false, staged: 0, modified: 0, untracked: 0, ahead: 3, behind: 1 }
    const result = renderGitStatus(git)
    expect(result).toContain("↑3")
    expect(result).toContain("↓1")
  })
})

describe("renderWorkspaceInfo", () => {
  test("returns empty array for minimal data", () => {
    expect(renderWorkspaceInfo(MINIMAL_DATA)).toEqual([])
  })

  test("includes worktree name", () => {
    const data = { ...MINIMAL_DATA, worktree: "feature-branch" }
    const parts = renderWorkspaceInfo(data)
    expect(parts.some(p => p.includes("feature-branch"))).toBe(true)
  })

  test("includes line change counts", () => {
    const data = { ...MINIMAL_DATA, linesAdded: 10, linesRemoved: 5 }
    const parts = renderWorkspaceInfo(data)
    expect(parts.some(p => p.includes("+10") && p.includes("-5"))).toBe(true)
  })

  test("includes vim mode", () => {
    const data = { ...MINIMAL_DATA, vimMode: "NORMAL" }
    const parts = renderWorkspaceInfo(data)
    expect(parts.some(p => p.includes("NORMAL"))).toBe(true)
  })
})

describe("renderRateLimit", () => {
  test("renders 5h rate limit with gauge icon", () => {
    const result = renderRateLimit("5h", { pct: 75, resetsAt: 0 })
    expect(result).toContain("5h")
    expect(result).toContain("75%")
    expect(result).toContain("\uf0e4") // gauge icon
  })

  test("renders 7d rate limit without gauge icon", () => {
    const result = renderRateLimit("7d", { pct: 50, resetsAt: 0 })
    expect(result).toContain("7d")
    expect(result).toContain("50%")
    expect(result).not.toContain("\uf0e4")
  })

  test("includes reset countdown when available", () => {
    const futureEpoch = Math.floor(Date.now() / 1000) + 1800
    const result = renderRateLimit("5h", { pct: 80, resetsAt: futureEpoch })
    expect(result).toContain("m") // should contain minutes countdown
  })
})

describe("renderRunningTools", () => {
  test("returns empty array for no tools", () => {
    expect(renderRunningTools([])).toEqual([])
  })

  test("renders tool with target", () => {
    const result = renderRunningTools([{ name: "read", target: "file.ts" }])
    expect(result.length).toBe(1)
    expect(result[0]).toContain("read: file.ts")
  })

  test("renders tool without target", () => {
    const result = renderRunningTools([{ name: "bash", target: "" }])
    expect(result[0]).toContain("bash")
    expect(result[0]).not.toContain(":")
  })
})

describe("renderCompletedTools", () => {
  test("returns empty array for empty map", () => {
    expect(renderCompletedTools(new Map())).toEqual([])
  })

  test("renders tool counts with checkmark", () => {
    const tools = new Map([["read", 5], ["edit", 3]])
    const result = renderCompletedTools(tools)
    expect(result.length).toBe(2)
    expect(result[0]).toContain("read")
    expect(result[0]).toContain("×5")
    expect(result[0]).toContain("✓")
  })

  test("respects limit parameter", () => {
    const tools = new Map([["a", 1], ["b", 2], ["c", 3]])
    const result = renderCompletedTools(tools, 2)
    expect(result.length).toBe(2)
  })
})

describe("renderAgents", () => {
  test("returns empty array for no agents", () => {
    expect(renderAgents([])).toEqual([])
  })

  test("renders running agent with spinner", () => {
    const result = renderAgents([{ type: "Explore", description: "search", running: true, elapsed: 5000 }])
    expect(result.length).toBe(1)
    expect(result[0]).toContain("Explore")
    expect(result[0]).toContain("5s")
  })

  test("renders completed agent with checkmark", () => {
    const result = renderAgents([{ type: "Plan", description: "design", running: false, elapsed: 120_000 }])
    expect(result[0]).toContain("✓")
    expect(result[0]).toContain("Plan")
    expect(result[0]).toContain("2m")
  })
})

describe("renderTodos", () => {
  test("returns null for no todos", () => {
    expect(renderTodos({ total: 0, completed: 0, current: null })).toBeNull()
  })

  test("renders current in-progress task", () => {
    const result = renderTodos({ total: 5, completed: 2, current: "Fix the bug" })
    expect(result).toContain("Fix the bug")
    expect(result).toContain("2/5")
    expect(result).toContain("▸")
  })

  test("truncates long task names", () => {
    const longName = "This is a very long task name that should be truncated"
    const result = renderTodos({ total: 1, completed: 0, current: longName })
    expect(result).toContain("...")
    expect(vlen(result!)).toBeLessThan(vlen(longName) + 20)
  })

  test("renders all-complete state", () => {
    const result = renderTodos({ total: 3, completed: 3, current: null })
    expect(result).toContain("All complete")
    expect(result).toContain("3/3")
    expect(result).toContain("✓")
  })

  test("returns null when not all complete and no current", () => {
    expect(renderTodos({ total: 3, completed: 1, current: null })).toBeNull()
  })
})

describe("renderActivityTitle", () => {
  test("returns empty string with no config and no session", () => {
    expect(renderActivityTitle(null, null, null)).toBe("")
  })

  test("includes CLAUDE.md count", () => {
    const config = { claudeMd: 2, mcps: 0, hooks: 0, rules: 0 }
    const result = renderActivityTitle(config, null, null)
    expect(result).toContain("2 CLAUDE.md")
  })

  test("includes MCP count with health status", () => {
    const config = { claudeMd: 0, mcps: 3, hooks: 0, rules: 0 }
    const mcpStatus = { ok: new Set(["a", "b"]), errored: new Set<string>() }
    const result = renderActivityTitle(config, mcpStatus, null)
    expect(result).toContain("MCPs")
    expect(result).toContain("✓")
  })

  test("shows MCP errors", () => {
    const config = { claudeMd: 0, mcps: 3, hooks: 0, rules: 0 }
    const mcpStatus = { ok: new Set(["a"]), errored: new Set(["b"]) }
    const result = renderActivityTitle(config, mcpStatus, null)
    expect(result).toContain("✗")
  })

  test("includes session name", () => {
    expect(renderActivityTitle(null, null, "my-session")).toContain("my-session")
  })

  test("includes hooks and rules counts", () => {
    const config = { claudeMd: 0, mcps: 0, hooks: 2, rules: 3 }
    const result = renderActivityTitle(config, null, null)
    expect(result).toContain("2 hooks")
    expect(result).toContain("3 rules")
  })
})
