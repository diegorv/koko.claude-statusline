import { describe, expect, test } from "bun:test"
import { renderAgents } from "../../../src/ui/components/agents"

describe("renderAgents", () => {
  test("returns empty array for no agents", () => {
    expect(renderAgents([])).toEqual([])
  })

  test("renders running agent with spinner", () => {
    const result = renderAgents([{ type: "Explore", description: "search", running: true, elapsed: 5000 }])
    expect(result.length).toBe(1)
    expect(result[0]).toContain("Explore")
    expect(result[0]).toContain("5s")
  })

  test("renders completed agent with checkmark", () => {
    const result = renderAgents([{ type: "Plan", description: "design", running: false, elapsed: 120_000 }])
    expect(result[0]).toContain("✓")
    expect(result[0]).toContain("Plan")
    expect(result[0]).toContain("2m")
  })
})
