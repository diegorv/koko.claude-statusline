import { describe, expect, test } from "bun:test"
import { renderActivityTitle } from "../../../src/ui/components/activity-title"

describe("renderActivityTitle", () => {
  test("returns empty string with no config and no session", () => {
    expect(renderActivityTitle(null, null, null)).toBe("")
  })

  test("includes CLAUDE.md count", () => {
    const config = { claudeMd: 2, mcps: 0, hooks: 0, rules: 0, effortLevel: null }
    const result = renderActivityTitle(config, null, null)
    expect(result).toContain("2 CLAUDE.md")
  })

  test("includes MCP count with health status", () => {
    const config = { claudeMd: 0, mcps: 3, hooks: 0, rules: 0, effortLevel: null }
    const mcpStatus = { ok: new Set(["a", "b"]), errored: new Set<string>() }
    const result = renderActivityTitle(config, mcpStatus, null)
    expect(result).toContain("MCPs")
    expect(result).toContain("✓")
  })

  test("shows MCP errors", () => {
    const config = { claudeMd: 0, mcps: 3, hooks: 0, rules: 0, effortLevel: null }
    const mcpStatus = { ok: new Set(["a"]), errored: new Set(["b"]) }
    const result = renderActivityTitle(config, mcpStatus, null)
    expect(result).toContain("✗")
  })

  test("includes session name", () => {
    expect(renderActivityTitle(null, null, "my-session")).toContain("my-session")
  })

  test("includes hooks and rules counts", () => {
    const config = { claudeMd: 0, mcps: 0, hooks: 2, rules: 3, effortLevel: null }
    const result = renderActivityTitle(config, null, null)
    expect(result).toContain("2 hooks")
    expect(result).toContain("3 rules")
  })

  test("includes a non-default output style", () => {
    const result = renderActivityTitle(null, null, null, "explanatory")
    expect(result).toContain("explanatory")
  })

  test("hides the default output style", () => {
    expect(renderActivityTitle(null, null, null, "default")).toBe("")
  })

  test("treats a null output style as absent", () => {
    expect(renderActivityTitle(null, null, null, null)).toBe("")
  })

  test("places output style before session name when both are present", () => {
    const result = renderActivityTitle(null, null, "my-session", "succinct")
    const succinctIdx = result.indexOf("succinct")
    const sessionIdx = result.indexOf("my-session")
    expect(succinctIdx).toBeGreaterThan(-1)
    expect(sessionIdx).toBeGreaterThan(succinctIdx)
  })
})
