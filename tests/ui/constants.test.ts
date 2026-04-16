import { describe, expect, test } from "bun:test"
import { ICONS, GAP, SEP, spin } from "../../src/ui/constants"
import { vlen } from "../../src/ui/format"

describe("ICONS", () => {
  test("contains expected nerd font icons", () => {
    expect(ICONS.branch).toBe("\ue0a0")
    expect(ICONS.gauge).toBe("\uf0e4")
    expect(ICONS.tree).toBe("\uf1bb")
  })
})

describe("GAP", () => {
  test("is 3 spaces", () => {
    expect(GAP).toBe("   ")
    expect(GAP.length).toBe(3)
  })
})

describe("SEP", () => {
  test("contains a vertical bar separator", () => {
    expect(SEP).toContain("│")
  })

  test("is dimmed", () => {
    expect(SEP).toContain("\x1b[2m")
  })

  test("has visual length of 5", () => {
    expect(vlen(SEP)).toBe(5)
  })
})

describe("spin", () => {
  test("returns one of the spinner frames", () => {
    const frames = ["◐", "◓", "◑", "◒"]
    expect(frames).toContain(spin())
  })

  test("returns a single character", () => {
    expect([...spin()].length).toBe(1)
  })
})
