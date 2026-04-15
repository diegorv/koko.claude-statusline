import { describe, expect, test } from "bun:test"
import { box } from "../../src/ui/box"
import { vlen } from "../../src/ui/format"

describe("box", () => {
  test("renders a box with correct top and bottom borders", () => {
    const result = box("hello", { width: 20 })
    const lines = result.split("\n")
    expect(lines[0]).toContain("╭")
    expect(lines[0]).toContain("╮")
    expect(lines[lines.length - 1]).toContain("╰")
    expect(lines[lines.length - 1]).toContain("╯")
  })

  test("renders side borders on content lines", () => {
    const result = box("hello", { width: 20 })
    const lines = result.split("\n")
    // Middle line should have vertical borders
    expect(lines[1]).toContain("│")
  })

  test("applies dim ANSI to borders", () => {
    const result = box("hello", { width: 20 })
    const lines = result.split("\n")
    // Borders should be wrapped in dim escape codes
    expect(lines[0]).toContain("\x1b[2m")
    expect(lines[0]).toContain("\x1b[0m")
    expect(lines[1]).toContain("\x1b[2m") // side border dim
  })

  test("total visual width matches specified width", () => {
    const result = box("hi", { width: 30 })
    const lines = result.split("\n")
    // Top and bottom borders should have visual width = specified width
    expect(vlen(lines[0])).toBe(30)
    expect(vlen(lines[lines.length - 1])).toBe(30)
  })

  test("pads content lines to fill inner width", () => {
    const result = box("hi", { width: 20 })
    const lines = result.split("\n")
    // Content line visual width should also be box width (border + padded content + border)
    expect(vlen(lines[1])).toBe(20)
  })

  test("adds top padding lines", () => {
    const result = box("content", { width: 20, padding: { top: 2 } })
    const lines = result.split("\n")
    // top border + 2 padding + 1 content + bottom border = 5 lines
    expect(lines.length).toBe(5)
    // Padding lines should be empty (just spaces + borders)
    expect(lines[1]).not.toContain("content")
    expect(lines[2]).not.toContain("content")
    expect(lines[3]).toContain("content")
  })

  test("adds bottom padding lines", () => {
    const result = box("content", { width: 20, padding: { bottom: 1 } })
    const lines = result.split("\n")
    // top border + 1 content + 1 padding + bottom border = 4 lines
    expect(lines.length).toBe(4)
    expect(lines[1]).toContain("content")
    expect(lines[2]).not.toContain("content")
  })

  test("adds left padding", () => {
    const result = box("X", { width: 10, padding: { left: 2 } })
    const lines = result.split("\n")
    // Content line: border + 2 spaces + "X" + fill + border
    const contentLine = lines[1]
    // After stripping the left dim border, should start with spaces
    const afterBorder = contentLine.replace(/^\x1b\[2m│\x1b\[0m/, "")
    expect(afterBorder.startsWith("  X")).toBe(true)
  })

  test("handles multiline content", () => {
    const result = box("line1\nline2\nline3", { width: 20 })
    const lines = result.split("\n")
    // top + 3 content + bottom = 5 lines
    expect(lines.length).toBe(5)
    expect(lines[1]).toContain("line1")
    expect(lines[2]).toContain("line2")
    expect(lines[3]).toContain("line3")
  })

  test("handles empty content with minimum one line", () => {
    const result = box("", { width: 15 })
    const lines = result.split("\n")
    // top + 1 empty line + bottom = 3 lines
    expect(lines.length).toBe(3)
    expect(vlen(lines[0])).toBe(15)
  })

  test("handles content with ANSI codes correctly", () => {
    const colored = "\x1b[31mred\x1b[0m"
    const result = box(colored, { width: 20 })
    const lines = result.split("\n")
    // Content line should still have correct visual width
    expect(vlen(lines[1])).toBe(20)
    // Content should be preserved
    expect(lines[1]).toContain("red")
  })
})
