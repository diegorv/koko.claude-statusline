import { describe, expect, test } from "bun:test"
import { renderEffort } from "../../../src/ui/components/effort"

describe("renderEffort", () => {
  test("returns null when level is null", () => {
    expect(renderEffort(null)).toBeNull()
  })

  test("includes the literal effort level text", () => {
    for (const level of ["low", "medium", "high", "xhigh", "max"] as const) {
      expect(renderEffort(level)).toContain(level)
    }
  })

  test("prefixes with a dim 'effort: ' label (no pipe — SEP is added by the caller)", () => {
    const out = renderEffort("high")!
    expect(out).toContain("effort: ")
    expect(out).not.toContain("|")
  })

  test("low is rendered dimmed, not colored", () => {
    // dim escape is \x1b[2m; colored values use \x1b[3Xm
    expect(renderEffort("low")).toContain("\x1b[2m")
    expect(renderEffort("low")).not.toContain("\x1b[32m")
  })

  test("max uses red", () => {
    expect(renderEffort("max")).toContain("\x1b[31m")
  })

  test("xhigh uses magenta", () => {
    expect(renderEffort("xhigh")).toContain("\x1b[35m")
  })
})
