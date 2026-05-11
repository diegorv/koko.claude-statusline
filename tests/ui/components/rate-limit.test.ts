import { describe, expect, test } from "bun:test"
import { renderRateLimit } from "../../../src/ui/components/rate-limit"

describe("renderRateLimit", () => {
  test("renders the 5h rate limit without an internal gauge icon (gutter owns it)", () => {
    const result = renderRateLimit("5h", { pct: 75, resetsAt: 0 })
    expect(result).toContain("5h")
    expect(result).toContain("75%")
    // The row hosting rate limits prepends the gauge icon as its gutter, so
    // the component must not emit its own \u2014 that would render two gauges.
    expect(result).not.toContain("\uf0e4")
  })

  test("renders the 7d rate limit without an internal gauge icon", () => {
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
