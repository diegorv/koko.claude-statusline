import { describe, expect, test } from "bun:test"
import { renderTokenBreakdown } from "../../../src/ui/components/token-breakdown.ts"

describe("renderTokenBreakdown", () => {
  test("returns null when every total is zero", () => {
    expect(renderTokenBreakdown({ input: 0, output: 0, cacheCreate: 0, cacheRead: 0 })).toBeNull()
  })

  test("renders input + output arrows when only those have value", () => {
    const result = renderTokenBreakdown({ input: 1200, output: 340, cacheCreate: 0, cacheRead: 0 })!
    expect(result).toContain("↑")
    expect(result).toContain("↓")
    expect(result).toContain("1k")
    expect(result).toContain("340")
    expect(result).not.toContain("◆")
  })

  test("merges cacheCreate and cacheRead into a single cache total", () => {
    const result = renderTokenBreakdown({ input: 1000, output: 100, cacheCreate: 30000, cacheRead: 50000 })!
    expect(result).toContain("◆")
    expect(result).toContain("80k") // 30k + 50k merged
  })

  test("omits the cache marker when total cache is zero but other fields aren't", () => {
    const result = renderTokenBreakdown({ input: 100, output: 50, cacheCreate: 0, cacheRead: 0 })!
    expect(result).not.toContain("◆")
  })

  test("formats large counts with the standard token formatter", () => {
    const result = renderTokenBreakdown({ input: 1_200_000, output: 50_000, cacheCreate: 0, cacheRead: 0 })!
    expect(result).toContain("1.2m")
    expect(result).toContain("50k")
  })
})
