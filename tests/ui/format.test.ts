import { describe, expect, test } from "bun:test"
import { formatDuration, formatTokens, pctColor, gradientBar, formatResetIn, vlen, nbsp, c, bold, dim } from "../../src/ui/format"

describe("formatDuration", () => {
  test("returns seconds for sub-minute durations", () => {
    expect(formatDuration(0)).toBe("0s")
    expect(formatDuration(500)).toBe("0s")
    expect(formatDuration(30_000)).toBe("30s")
    expect(formatDuration(59_999)).toBe("59s")
  })

  test("returns minutes for durations >= 1m and < 1h", () => {
    expect(formatDuration(60_000)).toBe("1m")
    expect(formatDuration(90_000)).toBe("1m")
    expect(formatDuration(300_000)).toBe("5m")
  })

  test("returns hours and minutes for durations >= 1h", () => {
    expect(formatDuration(3_600_000)).toBe("1h")
    expect(formatDuration(3_661_000)).toBe("1h 1m")
    expect(formatDuration(5_400_000)).toBe("1h 30m")
  })
})

describe("pctColor", () => {
  test("returns green below 50%", () => {
    expect(pctColor(0)).toBe("\x1b[32m")
    expect(pctColor(49)).toBe("\x1b[32m")
  })

  test("returns yellow at 50-69%", () => {
    expect(pctColor(50)).toBe("\x1b[33m")
    expect(pctColor(69)).toBe("\x1b[33m")
  })

  test("returns true-color orange at 70-89%", () => {
    expect(pctColor(70)).toBe("\x1b[38;2;255;170;60m")
    expect(pctColor(89)).toBe("\x1b[38;2;255;170;60m")
  })

  test("returns red at >= 90%", () => {
    expect(pctColor(90)).toBe("\x1b[31m")
    expect(pctColor(100)).toBe("\x1b[31m")
  })
})

describe("gradientBar", () => {
  test("visual length equals width parameter", () => {
    expect(vlen(gradientBar(50, 10))).toBe(10)
    expect(vlen(gradientBar(0, 20))).toBe(20)
    expect(vlen(gradientBar(100, 5))).toBe(5)
  })

  test("all empty blocks at 0%", () => {
    const bar = gradientBar(0, 5)
    expect(bar).not.toContain("\u2588") // no filled blocks
    expect(bar).toContain("\u2591")     // empty blocks present
  })

  test("all filled blocks at 100%", () => {
    const bar = gradientBar(100, 5)
    expect(bar).not.toContain("\u2591") // no empty blocks
    expect(bar).toContain("\u2588")     // filled blocks present
  })
})

describe("formatTokens", () => {
  test("returns raw count under 1k", () => {
    expect(formatTokens(0)).toBe("0")
    expect(formatTokens(999)).toBe("999")
  })

  test("rounds to 'Nk' between 1k and 1m", () => {
    expect(formatTokens(1000)).toBe("1k")
    expect(formatTokens(148_500)).toBe("149k")
    expect(formatTokens(200_000)).toBe("200k")
  })

  test("formats 'Nm' for millions, with 1 decimal only when fractional", () => {
    expect(formatTokens(1_000_000)).toBe("1m")
    expect(formatTokens(1_200_000)).toBe("1.2m")
    expect(formatTokens(2_000_000)).toBe("2m")
  })

  test("promotes values near the 1m threshold to 'm' (no '1000k')", () => {
    expect(formatTokens(949_999)).toBe("950k")
    expect(formatTokens(950_000)).toBe("1m")
    expect(formatTokens(999_500)).toBe("1m")
  })
})

describe("formatResetIn", () => {
  test("returns empty string for past timestamps", () => {
    const pastEpoch = Math.floor(Date.now() / 1000) - 60
    expect(formatResetIn(pastEpoch)).toBe("")
  })

  test("returns minutes for near-future timestamps", () => {
    const futureEpoch = Math.floor(Date.now() / 1000) + 1800 // +30 min
    const result = formatResetIn(futureEpoch)
    expect(result).toMatch(/^\d+m$/)
  })

  test("returns hours and minutes for distant-future timestamps", () => {
    const futureEpoch = Math.floor(Date.now() / 1000) + 7200 // +2h
    const result = formatResetIn(futureEpoch)
    expect(result).toMatch(/^\d+h/)
  })
})

describe("vlen", () => {
  test("returns length of plain string", () => {
    expect(vlen("hello")).toBe(5)
  })

  test("strips ANSI codes from length calculation", () => {
    expect(vlen("\x1b[31mred\x1b[0m")).toBe(3)
    expect(vlen("\x1b[1m\x1b[33mbold yellow\x1b[0m")).toBe(11)
  })

  test("handles empty string", () => {
    expect(vlen("")).toBe(0)
  })
})

describe("nbsp", () => {
  test("replaces spaces with non-breaking spaces", () => {
    expect(nbsp("hello world")).toBe("hello\u00A0world")
    expect(nbsp("a b c")).toBe("a\u00A0b\u00A0c")
  })

  test("returns unchanged string without spaces", () => {
    expect(nbsp("nospaces")).toBe("nospaces")
  })
})

describe("c", () => {
  test("wraps text in color codes", () => {
    const result = c("red", "error")
    expect(result).toContain("\x1b[31m")
    expect(result).toContain("error")
    expect(result).toContain("\x1b[0m")
  })

  test("returns text with reset for unknown color", () => {
    const result = c("unknown", "text")
    expect(result).toContain("text")
    expect(result).toContain("\x1b[0m")
  })
})

describe("bold", () => {
  test("wraps text in bold + color codes", () => {
    const result = bold("yellow", "warning")
    expect(result).toContain("\x1b[1m")
    expect(result).toContain("\x1b[33m")
    expect(result).toContain("warning")
  })
})

describe("dim", () => {
  test("wraps text in dim code", () => {
    const result = dim("faint")
    expect(result).toContain("\x1b[2m")
    expect(result).toContain("faint")
    expect(result).toContain("\x1b[0m")
  })
})
