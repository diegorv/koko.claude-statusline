import { describe, expect, test } from "bun:test"
import { opencodeAdapter } from "../../../src/agents/opencode/adapter.ts"
import type { OpenCodeInput } from "../../../src/agents/opencode/input.ts"
import { mapOpenCodeGit } from "../../../src/agents/opencode/git.ts"
import { render } from "../../../src/ui/render.ts"
import { renderLines } from "../../../src/ui/lines.ts"
import { buildSnapshot } from "../../../src/export/pane-header.ts"

const usage = { input: 100, output: 20, reasoning: 10, cache: { read: 50, write: 30 } }
const base: OpenCodeInput = { directory: "/project", width: 100, messages: [], children: [] }

describe("OpenCode adapter", () => {
  test("omits unknown usage and cost instead of showing zero", () => {
    const snapshot = opencodeAdapter.read(base)
    const text = renderLines(snapshot.data, render(snapshot, null))
    expect(snapshot.data.contextPercent).toBeNull()
    expect(snapshot.data.cost).toBeNull()
    expect(text).not.toContain("%")
    expect(text).not.toContain("¢")
    expect(buildSnapshot(snapshot.data, null).agent).toBe("opencode")
    expect(buildSnapshot(snapshot.data, null).context_pct).toBeNull()
  })

  test("maps native context and aggregate session tokens separately without counting reasoning twice", () => {
    const snapshot = opencodeAdapter.read({ ...base,
      model: { id: "model", name: "Model", variant: "high" },
      session: { id: "session", title: "Fix tests", tokens: { ...usage, input: 2000 } },
      cost: 0, status: "running", context: { tokens: usage, limit: 1000 },
    })
    expect(snapshot.data.contextTokens).toBe(200)
    expect(snapshot.data.contextPercent).toBe(20)
    expect(snapshot.activity?.tokenTotals.input).toBe(2000)
    expect(snapshot.data.cost).toBe(0)
    expect(snapshot.data.effortLevel).toBe("high")
    expect(buildSnapshot(snapshot.data, "high", 0)).toEqual({
      agent: "opencode", model: "Model", effort: "high", context_pct: 20, context_tokens: 200,
      cost_usd: 0, session_name: "Fix tests", updated_at: 0,
    })
  })

  test("handles streamed tool updates, errors, running input and children", () => {
    const snapshot = opencodeAdapter.read({ ...base,
      messages: [
        { id: "m1", type: "assistant", time: { created: 1 }, content: [{ id: "t", type: "tool", name: "read", state: { status: "running", input: {} } }] },
        { id: "m1", type: "assistant", time: { created: 1 }, content: [{ id: "t", type: "tool", name: "read", state: { status: "completed", input: {} } }] },
        { id: "m2", type: "assistant", time: { created: 2 }, content: [
          { id: "s", type: "tool", name: "bash", state: { status: "streaming", input: "{partial" } },
          { id: "r", type: "tool", name: "read", state: { status: "running", input: { filePath: "file.ts" } } },
          { id: "e", type: "tool", name: "edit", state: { status: "error", input: {} } },
        ] },
      ],
      children: [{ id: "child", agent: "explore", running: true }],
      mcps: [{ name: "good", status: { status: "connected" } }, { name: "bad", status: { status: "failed" } }],
    })
    expect(snapshot.activity?.tools).toEqual(new Map([["read", 1], ["edit", 1]]))
    expect(snapshot.activity?.runningTools).toEqual([{ name: "bash", target: "" }, { name: "read", target: "file.ts" }])
    expect(snapshot.activity?.agents[0]).toMatchObject({ type: "explore", running: true, elapsed: null })
    expect(snapshot.activity?.mcpStatus.errored).toEqual(new Set(["bad"]))
    expect(snapshot.config?.mcps).toBe(2)
  })

  test("excludes undone messages and hides stale activity if the boundary is not loaded", () => {
    const messages = ["before", "undo"].map(id => ({ id, type: "assistant", time: { created: 1 }, content: [{ type: "tool", id: "tool", name: id, state: { status: "completed" } }] }))
    expect(opencodeAdapter.read({ ...base, messages, revertMessageID: "undo" }).activity?.tools).toEqual(new Map([["before", 1]]))
    expect(opencodeAdapter.read({ ...base, messages, revertMessageID: "unloaded" }).activity?.tools.size).toBe(0)
  })

  test("maps server VCS data without inventing local details", () => {
    const git = mapOpenCodeGit("/remote/repo", "main", true)
    expect(git).toMatchObject({ repo: "repo", branch: "main", dirty: true, staged: null, ahead: null })
    const snapshot = opencodeAdapter.read(base)
    expect(render(snapshot, git).session[0]).toContain("main")
    expect(mapOpenCodeGit("/remote/repo", undefined, null)).toBeNull()
  })
})
