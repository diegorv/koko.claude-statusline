import { describe, expect, test } from "bun:test"
import { renderWorkspaceInfo } from "../../../src/ui/components/workspace-info"
import type { StdinData } from "../../../src/parsing/stdin"

const MINIMAL_DATA: StdinData = {
  model: "Opus", contextPercent: 50, contextTokens: null, cost: 0.05, durationMs: 60000,
  linesAdded: 0, linesRemoved: 0, cwd: "/tmp", contextWindowSize: null,
  sessionName: null, rateLimit5h: null, rateLimit7d: null,
  vimMode: null, worktree: null, transcriptPath: null,
}

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
