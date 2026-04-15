import { describe, expect, test } from "bun:test"
import { renderCompletedTools } from "../../../src/ui/components/completed-tools"

describe("renderCompletedTools", () => {
  test("returns empty array for empty map", () => {
    expect(renderCompletedTools(new Map())).toEqual([])
  })

  test("renders tool counts with checkmark", () => {
    const tools = new Map([["read", 5], ["edit", 3]])
    const result = renderCompletedTools(tools)
    expect(result.length).toBe(2)
    expect(result[0]).toContain("read")
    expect(result[0]).toContain("×5")
    expect(result[0]).toContain("✓")
  })

  test("respects limit parameter", () => {
    const tools = new Map([["a", 1], ["b", 2], ["c", 3]])
    const result = renderCompletedTools(tools, 2)
    expect(result.length).toBe(2)
  })
})
