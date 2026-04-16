import { describe, expect, test } from "bun:test"
import { renderBoxes } from "../../src/ui/boxes"
import { vlen } from "../../src/ui/format"
import type { StdinData } from "../../src/parsing/stdin"
import type { RenderResult } from "../../src/ui/render"

const MINIMAL_DATA: StdinData = {
  model: "Opus", contextPercent: 50, cost: 0.05, durationMs: 60000,
  linesAdded: 0, linesRemoved: 0, cwd: "/tmp", contextWindowSize: null,
  sessionName: null, rateLimit5h: null, rateLimit7d: null,
  vimMode: null, worktree: null, transcriptPath: null,
}

const EMPTY_RESULT: RenderResult = {
  session: [],
  activity: [],
  activityTitle: "",
}

describe("renderBoxes", () => {
  test("renders session box with model in title", () => {
    const output = renderBoxes(MINIMAL_DATA, EMPTY_RESULT)
    expect(output).toContain("Opus")
    expect(output).toContain("50%")
  })

  test("renders cost in title bar", () => {
    const output = renderBoxes(MINIMAL_DATA, EMPTY_RESULT)
    expect(output).toContain("5¢")
  })

  test("renders dollar format for cost >= $0.10", () => {
    const data = { ...MINIMAL_DATA, cost: 1.50 }
    const output = renderBoxes(data, EMPTY_RESULT)
    expect(output).toContain("$1.50")
  })

  test("renders duration when >= 1 second", () => {
    const output = renderBoxes(MINIMAL_DATA, EMPTY_RESULT)
    expect(output).toContain("1m")
  })

  test("omits duration when < 1 second", () => {
    const data = { ...MINIMAL_DATA, durationMs: 500 }
    const output = renderBoxes(data, EMPTY_RESULT)
    expect(output).not.toContain("⏱")
  })

  test("includes repo name in title when provided", () => {
    const output = renderBoxes(MINIMAL_DATA, EMPTY_RESULT, "my-repo")
    expect(output).toContain("my-repo")
  })

  test("only renders session box when activity is empty", () => {
    const output = renderBoxes(MINIMAL_DATA, EMPTY_RESULT)
    // Should have exactly one box (╭ appears once, ╰ appears once)
    expect(output.match(/╭/g)?.length).toBe(1)
    expect(output.match(/╰/g)?.length).toBe(1)
  })

  test("renders both boxes when activity has content", () => {
    const result: RenderResult = {
      session: ["session content"],
      activity: ["activity content"],
      activityTitle: "",
    }
    const output = renderBoxes(MINIMAL_DATA, result)
    // Should have two boxes (╭ appears twice)
    expect(output.match(/╭/g)?.length).toBe(2)
    expect(output.match(/╰/g)?.length).toBe(2)
  })

  test("activity box includes 'Activity' label in title", () => {
    const result: RenderResult = {
      session: [],
      activity: ["some tools"],
      activityTitle: "",
    }
    const output = renderBoxes(MINIMAL_DATA, result)
    expect(output).toContain("Activity")
  })

  test("activity box includes activity title on the right", () => {
    const result: RenderResult = {
      session: [],
      activity: ["some tools"],
      activityTitle: "2 CLAUDE.md",
    }
    const output = renderBoxes(MINIMAL_DATA, result)
    expect(output).toContain("Activity")
    expect(output).toContain("2 CLAUDE.md")
  })

  test("both boxes have consistent width", () => {
    const result: RenderResult = {
      session: ["short"],
      activity: ["also short"],
      activityTitle: "",
    }
    const output = renderBoxes(MINIMAL_DATA, result)
    const lines = output.split("\n")

    // Find bottom borders of both boxes (╰ lines)
    const bottomLines = lines.filter(l => l.includes("╰"))
    expect(bottomLines.length).toBe(2)
    expect(vlen(bottomLines[0])).toBe(vlen(bottomLines[1]))
  })

  test("title bar borders use dim ANSI", () => {
    const output = renderBoxes(MINIMAL_DATA, EMPTY_RESULT)
    const firstLine = output.split("\n")[0]
    expect(firstLine).toContain("\x1b[2m╭")
    expect(firstLine).toContain("╮\x1b[0m")
  })
})
