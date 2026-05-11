import { describe, expect, test } from "bun:test"
import { renderOutputSpeed } from "../../../src/ui/components/output-speed"

const NOW = 1_700_000_000_000  // arbitrary fixed clock for deterministic tests

describe("renderOutputSpeed", () => {
  test("returns null when fewer than two samples are available", () => {
    expect(renderOutputSpeed([], NOW)).toBeNull()
    expect(renderOutputSpeed([{ t: NOW - 1000, output: 500 }], NOW)).toBeNull()
  })

  test("returns null when the most recent sample is older than the freshness window", () => {
    const samples = [
      { t: NOW - 60_000, output: 0 },
      { t: NOW - 30_000, output: 600 },  // 30s ago — beyond 10s freshness
    ]
    expect(renderOutputSpeed(samples, NOW)).toBeNull()
  })

  test("returns null when the token spread between the two latest samples is too small", () => {
    const samples = [
      { t: NOW - 5_000, output: 100 },
      { t: NOW - 1_000, output: 199 },  // only 99 tokens, below the 200 spread threshold
    ]
    expect(renderOutputSpeed(samples, NOW)).toBeNull()
  })

  test("computes tok/s rate when samples are fresh and spread enough", () => {
    const samples = [
      { t: NOW - 5_000, output: 1000 },
      { t: NOW - 1_000, output: 1400 },  // 400 tokens in 4s → 100 tok/s
    ]
    const result = renderOutputSpeed(samples, NOW)!
    expect(result).toContain("100")
    expect(result).toContain("tok/s")
  })

  test("rounds the rate to an integer", () => {
    const samples = [
      { t: NOW - 7_000, output: 0 },
      { t: NOW - 1_000, output: 333 },  // 333 / 6 ≈ 55.5 → rounds to 56
    ]
    const result = renderOutputSpeed(samples, NOW)
    expect(result).toContain("56")
  })

  test("returns null on a degenerate (zero or negative) time delta", () => {
    const samples = [
      { t: NOW - 1_000, output: 100 },
      { t: NOW - 1_000, output: 500 },  // same timestamp — Δt = 0
    ]
    expect(renderOutputSpeed(samples, NOW)).toBeNull()
  })

  test("uses only the last two samples (ignores older history)", () => {
    const samples = [
      { t: NOW - 30_000, output: 0 },
      { t: NOW - 15_000, output: 5000 },  // ancient and huge — should be ignored
      { t: NOW - 5_000, output: 5100 },
      { t: NOW - 1_000, output: 5500 },  // last two: 400 tokens in 4s = 100 tok/s
    ]
    const result = renderOutputSpeed(samples, NOW)!
    expect(result).toContain("100")
  })
})
