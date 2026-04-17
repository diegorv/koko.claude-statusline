import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { renderLines } from "../../src/ui/lines"
import { vlen } from "../../src/ui/format"
import { SEP } from "../../src/ui/constants"
import type { StdinData } from "../../src/parsing/stdin"
import type { RenderResult } from "../../src/ui/render"

const ORIGINAL_STDOUT_COLS = process.stdout.columns
const ORIGINAL_STDERR_COLS = process.stderr.columns
const ORIGINAL_COLUMNS_ENV = process.env.COLUMNS
const ORIGINAL_RIGHT_MARGIN_ENV = process.env.CLAUDE_STATUSLINE_RIGHT_MARGIN

function setStreamColumns(stream: NodeJS.WriteStream, value: number | undefined): void {
  Object.defineProperty(stream, "columns", { value, configurable: true, writable: true })
}

beforeEach(() => {
  setStreamColumns(process.stdout, undefined)
  setStreamColumns(process.stderr, undefined)
  delete process.env.COLUMNS
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
  model: "Opus", contextPercent: 50, contextTokens: null, cost: 0.05, durationMs: 60000,
  linesAdded: 0, linesRemoved: 0, cwd: "/tmp", contextWindowSize: null,
  sessionName: null, rateLimit5h: null, rateLimit7d: null,
  vimMode: null, worktree: null, transcriptPath: null,
}

const EMPTY_RESULT: RenderResult = { session: [], activity: [], activityTitle: "", effort: null }

describe("renderLines header", () => {
  test("includes model name", () => {
    expect(renderLines(MINIMAL_DATA, EMPTY_RESULT)).toContain("Opus")
  })

  test("includes context percent rounded", () => {
    expect(renderLines(MINIMAL_DATA, EMPTY_RESULT)).toContain("50%")
  })

  test("renders cost in cents when below $0.10", () => {
    expect(renderLines(MINIMAL_DATA, EMPTY_RESULT)).toContain("5¢")
  })

  test("renders cost in dollars when >= $0.10", () => {
    const data = { ...MINIMAL_DATA, cost: 1.5 }
    expect(renderLines(data, EMPTY_RESULT)).toContain("$1.50")
  })

  test("includes duration when >= 1 second", () => {
    expect(renderLines(MINIMAL_DATA, EMPTY_RESULT)).toContain("1m")
  })

  test("omits duration when < 1 second", () => {
    const data = { ...MINIMAL_DATA, durationMs: 500 }
    expect(renderLines(data, EMPTY_RESULT)).not.toContain("⏱")
  })

  test("includes repo name when provided", () => {
    expect(renderLines(MINIMAL_DATA, EMPTY_RESULT, "my-repo")).toContain("my-repo")
  })
})

describe("renderLines structure", () => {
  test("emits header only when no body content", () => {
    const output = renderLines(MINIMAL_DATA, EMPTY_RESULT)
    const lines = output.split("\n")
    expect(lines).toHaveLength(1)
  })

  test("frames body content with top (┌──) and bottom (└──) rules", () => {
    const result: RenderResult = { session: ["body line"], activity: [], activityTitle: "", effort: null }
    const lines = renderLines(MINIMAL_DATA, result).split("\n")
    // header, top rule, body, bottom rule
    expect(lines).toHaveLength(4)
    expect(lines[1]).toContain("┌")
    expect(lines[1]).toContain("─")
    expect(lines[3]).toContain("└")
    expect(lines[3]).toContain("─")
  })

  test("includes session and activity rows in order; activityTitle goes in header", () => {
    const result: RenderResult = {
      session: ["SESS"],
      activity: ["ACT"],
      activityTitle: "TITLE",
    }
    const lines = renderLines(MINIMAL_DATA, result).split("\n")
    // header, top rule, session, activity, bottom rule
    expect(lines).toHaveLength(5)
    expect(lines[0]).toContain("TITLE")
    expect(lines[2]).toContain("SESS")
    expect(lines[3]).toContain("ACT")
    expect(lines[4]).toContain("└")
  })

  test("each row is left-padded with one space", () => {
    const result: RenderResult = { session: ["x"], activity: [], activityTitle: "", effort: null }
    for (const line of renderLines(MINIMAL_DATA, result).split("\n")) {
      expect(line.startsWith(" ")).toBe(true)
    }
  })

  test("activityTitle in header is dimmed", () => {
    const result: RenderResult = { session: [], activity: [], activityTitle: "ZZZ", effort: null }
    const output = renderLines(MINIMAL_DATA, result)
    expect(output).toContain("\x1b[2mZZZ")
  })

  test("header has dashed filler between left and right when terminal is wide", () => {
    setStreamColumns(process.stdout, 200)
    const output = renderLines(MINIMAL_DATA, EMPTY_RESULT)
    const headerRow = output.split("\n")[0]
    // Expect dashes (─) inside the header line, not just on the rule below.
    expect(headerRow).toContain("─")
  })
})

describe("renderLines wrapping", () => {
  test("wraps a long body line at SEP boundaries when terminal is narrow", () => {
    setStreamColumns(process.stdout, 50)
    const seg = (n: number) => `seg-${n}-1234567890`
    const longLine = [seg(1), seg(2), seg(3), seg(4)].join(SEP)
    const result: RenderResult = { session: [longLine], activity: [], activityTitle: "", effort: null }
    const lines = renderLines(MINIMAL_DATA, result).split("\n")
    // header, rule, then >=2 wrapped body lines
    const bodyLines = lines.slice(2)
    expect(bodyLines.length).toBeGreaterThan(1)
    // every body row stays within usable width
    for (const l of bodyLines) expect(vlen(l)).toBeLessThanOrEqual(50)
  })

  test("does not wrap when line has no SEP even if it exceeds width", () => {
    setStreamColumns(process.stdout, 20)
    const noSep = "x".repeat(100)
    const result: RenderResult = { session: [noSep], activity: [], activityTitle: "", effort: null }
    const lines = renderLines(MINIMAL_DATA, result).split("\n")
    // body line stays as one row (terminal handles visual wrap)
    expect(lines.filter(l => l.includes("xxxxx"))).toHaveLength(1)
  })

  test("rule width does not exceed usable width", () => {
    setStreamColumns(process.stdout, 60)
    const result: RenderResult = { session: ["short"], activity: [], activityTitle: "", effort: null }
    const ruleLine = renderLines(MINIMAL_DATA, result).split("\n")[1]
    expect(vlen(ruleLine)).toBeLessThanOrEqual(60)
  })
})

describe("renderLines terminal width fallbacks", () => {
  test("uses stderr.columns when stdout has none", () => {
    setStreamColumns(process.stderr, 200)
    const longLine = Array.from({ length: 8 }, (_, i) => `seg-${i}`).join(SEP)
    const result: RenderResult = { session: [longLine], activity: [], activityTitle: "", effort: null }
    // slice(2, -1) drops header + top rule + bottom rule, leaving only body rows
    const bodyLines = renderLines(MINIMAL_DATA, result).split("\n").slice(2, -1)
    // 8 short segments fit easily in 200 cols → no wrap
    expect(bodyLines).toHaveLength(1)
  })

  test("CLAUDE_STATUSLINE_RIGHT_MARGIN reduces usable width", () => {
    setStreamColumns(process.stdout, 100)
    process.env.CLAUDE_STATUSLINE_RIGHT_MARGIN = "40"
    const seg = (n: number) => `segment-number-${n}`
    const longLine = [seg(1), seg(2), seg(3), seg(4)].join(SEP)
    const result: RenderResult = { session: [longLine], activity: [], activityTitle: "", effort: null }
    const bodyLines = renderLines(MINIMAL_DATA, result).split("\n").slice(2)
    // With 60 usable cols (100 - 40), the line wraps
    expect(bodyLines.length).toBeGreaterThan(1)
  })
})
