import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { renderBoxes } from "../../src/ui/boxes"
import { vlen } from "../../src/ui/format"
import type { StdinData } from "../../src/parsing/stdin"
import type { RenderResult } from "../../src/ui/render"

const ORIGINAL_STDOUT_COLS = process.stdout.columns
const ORIGINAL_STDERR_COLS = process.stderr.columns
const ORIGINAL_COLUMNS_ENV = process.env.COLUMNS

function setStreamColumns(stream: NodeJS.WriteStream, value: number | undefined): void {
  Object.defineProperty(stream, "columns", { value, configurable: true, writable: true })
}

const ORIGINAL_RIGHT_MARGIN_ENV = process.env.CLAUDE_STATUSLINE_RIGHT_MARGIN

beforeEach(() => {
  // Pin terminal width detection to "unknown" so existing tests stay deterministic.
  setStreamColumns(process.stdout, undefined)
  setStreamColumns(process.stderr, undefined)
  delete process.env.COLUMNS
  // Pin margin to 0 so width assertions are exact.
  process.env.CLAUDE_STATUSLINE_RIGHT_MARGIN = "0"
})

afterEach(() => {
  setStreamColumns(process.stdout, ORIGINAL_STDOUT_COLS)
  setStreamColumns(process.stderr, ORIGINAL_STDERR_COLS)
  if (ORIGINAL_COLUMNS_ENV === undefined) delete process.env.COLUMNS
  else process.env.COLUMNS = ORIGINAL_COLUMNS_ENV
  if (ORIGINAL_RIGHT_MARGIN_ENV === undefined) delete process.env.CLAUDE_STATUSLINE_RIGHT_MARGIN
  else process.env.CLAUDE_STATUSLINE_RIGHT_MARGIN = ORIGINAL_RIGHT_MARGIN_ENV
})

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

  test("stretches box width to terminal width when terminal is wider than content", () => {
    setStreamColumns(process.stdout, 200)
    const output = renderBoxes(MINIMAL_DATA, EMPTY_RESULT)
    const bottomLine = output.split("\n").find(l => l.includes("╰"))!
    expect(vlen(bottomLine)).toBe(200)
  })

  test("falls back to stderr.columns when stdout has none (statusline mode)", () => {
    setStreamColumns(process.stdout, undefined)
    setStreamColumns(process.stderr, 180)
    const output = renderBoxes(MINIMAL_DATA, EMPTY_RESULT)
    const bottomLine = output.split("\n").find(l => l.includes("╰"))!
    expect(vlen(bottomLine)).toBe(180)
  })

  test("does not shrink box below content width when terminal is narrow", () => {
    setStreamColumns(process.stdout, 10)
    const result: RenderResult = {
      session: ["this is a long line that exceeds ten cols"],
      activity: [],
      activityTitle: "",
    }
    const output = renderBoxes(MINIMAL_DATA, result)
    const bottomLine = output.split("\n").find(l => l.includes("╰"))!
    // Box keeps content-driven width (much larger than 10), terminal will wrap visually.
    expect(vlen(bottomLine)).toBeGreaterThan(10)
  })

  test("both boxes share the stretched width when terminal width is set", () => {
    setStreamColumns(process.stdout, 160)
    const result: RenderResult = {
      session: ["short"],
      activity: ["also short"],
      activityTitle: "",
    }
    const output = renderBoxes(MINIMAL_DATA, result)
    const bottomLines = output.split("\n").filter(l => l.includes("╰"))
    expect(bottomLines).toHaveLength(2)
    expect(vlen(bottomLines[0])).toBe(160)
    expect(vlen(bottomLines[1])).toBe(160)
  })

  test("CLAUDE_STATUSLINE_RIGHT_MARGIN reserves columns on the right", () => {
    setStreamColumns(process.stdout, 200)
    process.env.CLAUDE_STATUSLINE_RIGHT_MARGIN = "20"
    const output = renderBoxes(MINIMAL_DATA, EMPTY_RESULT)
    const bottomLine = output.split("\n").find(l => l.includes("╰"))!
    expect(vlen(bottomLine)).toBe(180)
  })

  test("default right margin (16) applies when env var is not set", () => {
    setStreamColumns(process.stdout, 200)
    delete process.env.CLAUDE_STATUSLINE_RIGHT_MARGIN
    const output = renderBoxes(MINIMAL_DATA, EMPTY_RESULT)
    const bottomLine = output.split("\n").find(l => l.includes("╰"))!
    expect(vlen(bottomLine)).toBe(184)
  })
})
