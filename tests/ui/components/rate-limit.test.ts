import { describe, expect, test } from "bun:test"
import { renderRateLimit } from "../../../src/ui/components/rate-limit"

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
