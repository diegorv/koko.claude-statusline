import { describe, expect, test } from "bun:test"
import { renderTodos } from "../../../src/ui/components/todos"
import { vlen } from "../../../src/ui/format"

describe("renderTodos", () => {
  test("returns null for no todos", () => {
    expect(renderTodos({ total: 0, completed: 0, current: null })).toBeNull()
  })

  test("renders current in-progress task", () => {
    const result = renderTodos({ total: 5, completed: 2, current: "Fix the bug" })
    expect(result).toContain("Fix the bug")
    expect(result).toContain("2/5")
    expect(result).toContain("▸")
  })

  test("truncates long task names", () => {
    const longName = "This is a very long task name that should be truncated"
    const result = renderTodos({ total: 1, completed: 0, current: longName })
    expect(result).toContain("...")
    expect(vlen(result!)).toBeLessThan(vlen(longName) + 20)
  })

  test("renders all-complete state", () => {
    const result = renderTodos({ total: 3, completed: 3, current: null })
    expect(result).toContain("All complete")
    expect(result).toContain("3/3")
    expect(result).toContain("✓")
  })

  test("returns null when not all complete and no current", () => {
    expect(renderTodos({ total: 3, completed: 1, current: null })).toBeNull()
  })
})
