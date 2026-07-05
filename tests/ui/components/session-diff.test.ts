import { describe, expect, test } from "bun:test"
import { renderSessionDiff } from "../../../src/ui/components/session-diff.ts"
import type { StdinData } from "../../../src/parsing/stdin.ts"

const MINIMAL_DATA: StdinData = {
  model: "Opus", contextPercent: 50, contextTokens: null, cost: 0.05, durationMs: 60000,
  linesAdded: 0, linesRemoved: 0, cwd: "/tmp", contextWindowSize: null,
  sessionName: null, rateLimit5h: null, rateLimit7d: null,
  vimMode: null, worktree: null, transcriptPath: null, outputStyle: null,
}

describe("renderSessionDiff", () => {
  test("returns null when both counters are zero", () => {
    expect(renderSessionDiff(MINIMAL_DATA)).toBeNull()
  })

  test("renders +N -M when there is activity", () => {
    const result = renderSessionDiff({ ...MINIMAL_DATA, linesAdded: 42, linesRemoved: 17 })!
    expect(result).toContain("+42")
    expect(result).toContain("-17")
  })

  test("renders even when only added is non-zero", () => {
    const result = renderSessionDiff({ ...MINIMAL_DATA, linesAdded: 8, linesRemoved: 0 })!
    expect(result).toContain("+8")
    expect(result).toContain("-0")
  })

  test("renders even when only removed is non-zero", () => {
    const result = renderSessionDiff({ ...MINIMAL_DATA, linesAdded: 0, linesRemoved: 3 })!
    expect(result).toContain("+0")
    expect(result).toContain("-3")
  })
})
