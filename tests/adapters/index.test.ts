import { describe, expect, test } from "bun:test"
import { selectAdapter, parseAgentArgument } from "../../src/adapters/index.ts"

describe("adapter selection", () => {
  test("keeps existing Claude invocations and auto-detects Antigravity", () => {
    expect(selectAdapter({}).id).toBe("claude")
    expect(selectAdapter({ product: "antigravity" }).id).toBe("antigravity")
    expect(selectAdapter({}, "antigravity").id).toBe("antigravity")
    expect(selectAdapter({ product: "antigravity" }, "claude").id).toBe("claude")
  })
  test("rejects unsupported agents instead of interpreting them as Claude", () => {
    for (const id of ["codex", "opencode", "unknown"]) {
      expect(() => selectAdapter({}, id)).toThrow("Unsupported agent")
      expect(() => selectAdapter({ product: id })).toThrow("Unsupported agent")
    }
  })
  test("accepts explicit selection and rejects malformed arguments", () => {
    expect(parseAgentArgument([])).toBeUndefined()
    expect(parseAgentArgument(["--agent", "claude"])).toBe("claude")
    expect(parseAgentArgument(["--agent=antigravity"])).toBe("antigravity")
    for (const args of [["--agent"], ["--agent="], ["--unknown"], ["--agent", "claude", "extra"]]) {
      expect(() => parseAgentArgument(args)).toThrow("Usage:")
    }
  })
})
