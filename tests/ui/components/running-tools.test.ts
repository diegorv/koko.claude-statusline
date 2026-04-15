import { describe, expect, test } from "bun:test"
import { renderRunningTools } from "../../../src/ui/components/running-tools"

describe("renderRunningTools", () => {
  test("returns empty array for no tools", () => {
    expect(renderRunningTools([])).toEqual([])
  })

  test("renders tool with target", () => {
    const result = renderRunningTools([{ name: "read", target: "file.ts" }])
    expect(result.length).toBe(1)
    expect(result[0]).toContain("read: file.ts")
  })

  test("renders tool without target", () => {
    const result = renderRunningTools([{ name: "bash", target: "" }])
    expect(result[0]).toContain("bash")
    expect(result[0]).not.toContain(":")
  })
})
