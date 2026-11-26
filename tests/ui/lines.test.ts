import { describe, expect, test } from "bun:test"
import { renderLines } from "../../src/ui/lines.ts"
import { vlen } from "../../src/ui/format.ts"
import { SEP } from "../../src/ui/constants.ts"
import type { SessionData } from "../../src/core/model.ts"
import type { RenderResult } from "../../src/ui/rows.ts"
import type { PanelLayout } from "../../src/ui/layout.ts"

const layout: PanelLayout = { terminalWidth: null, rightMargin: 0, frameWidth: "content" }

const MINIMAL_DATA: SessionData = {
  agent: "claude", effortLevel: null, costEstimated: false, state: null,
  model: "Opus", contextPercent: 50, contextTokens: null, cost: 0.05, durationMs: 60000,
  linesAdded: 0, linesRemoved: 0, cwd: "/tmp", contextWindowSize: null,
  sessionName: null, sessionId: null, rateLimits: [],
  vimMode: null, worktree: null, outputStyle: null,
}

const EMPTY_RESULT: RenderResult = { session: [], activity: [], activityTitle: "", effort: null }

describe("renderLines header", () => {
  test("includes model name", () => {
    expect(renderLines(MINIMAL_DATA, EMPTY_RESULT, layout)).toContain("Opus")
  })

  test("includes context percent rounded", () => {
    expect(renderLines(MINIMAL_DATA, EMPTY_RESULT, layout)).toContain("50%")
  })

  test("renders cost in cents when below $0.10", () => {
    expect(renderLines(MINIMAL_DATA, EMPTY_RESULT, layout)).toContain("5¢")
  })

  test("renders cost in dollars when >= $0.10", () => {
    const data = { ...MINIMAL_DATA, cost: 1.5 }
    expect(renderLines(data, EMPTY_RESULT, layout)).toContain("$1.50")
  })

  test("includes duration when >= 1 second", () => {
    expect(renderLines(MINIMAL_DATA, EMPTY_RESULT, layout)).toContain("1m")
  })

  test("omits duration when < 1 second", () => {
    const data = { ...MINIMAL_DATA, durationMs: 500 }
    expect(renderLines(data, EMPTY_RESULT, layout)).not.toContain("⏱")
  })

  test("includes repo name when provided", () => {
    expect(renderLines(MINIMAL_DATA, EMPTY_RESULT, layout, "my-repo")).toContain("my-repo")
  })
})

describe("renderLines structure", () => {
  test("emits header only when no body content", () => {
    const output = renderLines(MINIMAL_DATA, EMPTY_RESULT, layout)
    const lines = output.split("\n")
    expect(lines).toHaveLength(1)
  })

  test("frames body content with top (┌──) and bottom (└──) rules", () => {
    const result: RenderResult = { session: ["body line"], activity: [], activityTitle: "", effort: null }
    const lines = renderLines(MINIMAL_DATA, result, layout).split("\n")
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
      effort: null,
    }
    const lines = renderLines(MINIMAL_DATA, result, layout).split("\n")
    // header, ┌, session, ├, activity, └ — a single box with an internal
    // tee divider when both session and activity have content.
    expect(lines).toHaveLength(6)
    expect(lines[0]).toContain("TITLE")
    expect(lines[1]).toContain("┌")
    expect(lines[2]).toContain("SESS")
    expect(lines[3]).toContain("├")
    expect(lines[4]).toContain("ACT")
    expect(lines[5]).toContain("└")
  })

  test("emits a single box when only session rows are present", () => {
    const result: RenderResult = { session: ["SESS"], activity: [], activityTitle: "", effort: null }
    const lines = renderLines(MINIMAL_DATA, result, layout).split("\n")
    expect(lines).toHaveLength(4)  // header, ┌, SESS, └
    expect(lines[1]).toContain("┌")
    expect(lines[3]).toContain("└")
  })

  test("emits a single box when only activity rows are present", () => {
    const result: RenderResult = { session: [], activity: ["ACT"], activityTitle: "", effort: null }
    const lines = renderLines(MINIMAL_DATA, result, layout).split("\n")
    expect(lines).toHaveLength(4)
    expect(lines[1]).toContain("┌")
    expect(lines[3]).toContain("└")
  })

  test("each row is left-padded with one space (after the leading ANSI reset)", () => {
    const result: RenderResult = { session: ["x"], activity: [], activityTitle: "", effort: null }
    for (const line of renderLines(MINIMAL_DATA, result, layout).split("\n")) {
      // Lines start with a leading "\x1b[0m" reset (introduced to defend
      // against Claude Code's dim styling leaking into the first char of a
      // row); skip it before checking the pad.
      expect(line.startsWith("\x1b[0m ")).toBe(true)
    }
  })

  test("each row starts with the ANSI reset escape", () => {
    const result: RenderResult = { session: ["x"], activity: ["y"], activityTitle: "", effort: null }
    for (const line of renderLines(MINIMAL_DATA, result, layout).split("\n")) {
      expect(line.startsWith("\x1b[0m")).toBe(true)
    }
  })

  test("activityTitle in header is dimmed", () => {
    const result: RenderResult = { session: [], activity: [], activityTitle: "ZZZ", effort: null }
    const output = renderLines(MINIMAL_DATA, result, layout)
    expect(output).toContain("\x1b[2mZZZ")
  })

  test("header has dashed filler between left and right when terminal is wide", () => {
    const output = renderLines(MINIMAL_DATA, EMPTY_RESULT, { ...layout, terminalWidth: 200 })
    const headerRow = output.split("\n")[0]
    // Expect dashes (─) inside the header line, not just on the rule below.
    expect(headerRow).toContain("─")
  })
})

describe("renderLines wrapping", () => {
  test("wraps a long body line at SEP boundaries when terminal is narrow", () => {
    const seg = (n: number) => `seg-${n}-1234567890`
    const longLine = [seg(1), seg(2), seg(3), seg(4)].join(SEP)
    const result: RenderResult = { session: [longLine], activity: [], activityTitle: "", effort: null }
    const lines = renderLines(MINIMAL_DATA, result, { ...layout, terminalWidth: 50 }).split("\n")
    // header, rule, then >=2 wrapped body lines
    const bodyLines = lines.slice(2)
    expect(bodyLines.length).toBeGreaterThan(1)
    // every body row stays within usable width
    for (const l of bodyLines) expect(vlen(l)).toBeLessThanOrEqual(50)
  })

  test("does not wrap when line has no SEP even if it exceeds width", () => {
    const noSep = "x".repeat(100)
    const result: RenderResult = { session: [noSep], activity: [], activityTitle: "", effort: null }
    const lines = renderLines(MINIMAL_DATA, result, { ...layout, terminalWidth: 20 }).split("\n")
    // body line stays as one row (terminal handles visual wrap)
    expect(lines.filter(l => l.includes("xxxxx"))).toHaveLength(1)
  })

  test("rule width does not exceed usable width", () => {
    const result: RenderResult = { session: ["short"], activity: [], activityTitle: "", effort: null }
    const ruleLine = renderLines(MINIMAL_DATA, result, { ...layout, terminalWidth: 60 }).split("\n")[1]
    expect(vlen(ruleLine)).toBeLessThanOrEqual(60)
  })
})

test("reserves the explicit right margin when wrapping body rows", () => {
  const result = { ...EMPTY_RESULT, session: ["first-" + "a".repeat(52) + SEP + "second-" + "b".repeat(52)] }
  const data = { ...MINIMAL_DATA, cost: null, durationMs: null }
  const renderBody = (rightMargin: number) => renderLines(data, result, {
    ...layout, terminalWidth: 130, rightMargin,
  }).split("\n").filter(line => /first-|second-/.test(line))
  expect(renderBody(0)).toHaveLength(1)
  expect(renderBody(16)).toHaveLength(2)
})

test("preserves rendered colors, spaces, graphemes and frames at two widths", () => {
  const result = { ...EMPTY_RESULT, session: [`工作目錄${SEP}👩‍💻 é`] }
  const panels = [14, 24].map(terminalWidth => renderLines(
    { ...MINIMAL_DATA, contextPercent: null, durationMs: null, cost: null },
    result, { ...layout, terminalWidth },
  ).replaceAll("\x1b", "␛").replaceAll("\u00a0", "␣"))
  expect(panels).toEqual([
    [
      "␛[0m ␛[36mOpus␛[0m",
      "␛[0m ␛[38;2;110;110;120m┌───────␛[0m",
      "␛[0m 工作目錄",
      "␛[0m 👩‍💻␣é",
      "␛[0m ␛[38;2;110;110;120m└───────␛[0m",
    ].join("\n"),
    [
      "␛[0m ␛[36mOpus␛[0m",
      "␛[0m ␛[38;2;110;110;120m┌────────────────␛[0m",
      "␛[0m 工作目錄␛[2m␣␣│␣␣␛[0m👩‍💻␣é",
      "␛[0m ␛[38;2;110;110;120m└────────────────␛[0m",
    ].join("\n"),
  ])
})
