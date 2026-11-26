import { describe, expect, test } from "bun:test"
import { mapOpenCodeSnapshot } from "../mapping/adapter.ts"
import type { OpenCodeInput } from "../mapping/input.ts"
import { mapOpenCodeGit } from "../mapping/git.ts"
import { EMPTY_WORKSPACE } from "../../../src/core/workspace.ts"
import { render } from "../../../src/ui/render.ts"
import { buildSnapshot } from "../../../src/export/pane-header.ts"

const layout = { terminalWidth: 100, rightMargin: 0, frameWidth: "available" } as const
const usage = { input: 100, output: 20, reasoning: 10, cache: { read: 50, write: 30 } }
const base: OpenCodeInput = { directory: "/project", messages: [], children: [] }

describe("OpenCode adapter", () => {
  test("omits unknown usage and cost instead of showing zero", () => {
    const snapshot = mapOpenCodeSnapshot(base)
    const text = render(snapshot, EMPTY_WORKSPACE, layout).output
    expect(snapshot.data.contextPercent).toBeNull()
    expect(snapshot.data.cost).toBeNull()
    expect(text).not.toContain("%")
    expect(text).not.toContain("¢")
    expect(buildSnapshot(snapshot.data, null).agent).toBe("opencode")
    expect(buildSnapshot(snapshot.data, null).context_pct).toBeNull()
  })

  test("maps native context and aggregate session tokens separately including separate reasoning usage", () => {
    const snapshot = mapOpenCodeSnapshot({ ...base,
      model: { name: "Model", variant: "high" },
      session: { id: "session", title: "Fix tests", tokens: { ...usage, input: 2000 } },
      cost: 0, status: "running", context: { tokens: usage, limit: 1000 },
    })
    expect(snapshot.data.contextTokens).toBe(210)
    expect(snapshot.data.contextPercent).toBe(21)
    expect(snapshot.activity?.tokenTotals.input).toBe(2000)
    expect(snapshot.activity?.tokenTotals.output).toBe(30)
    expect(snapshot.data.cost).toBe(0)
    expect(snapshot.data.effortLevel).toBe("high")
    expect(buildSnapshot(snapshot.data, "high", 0)).toEqual({
      agent: "opencode", model: "Model", effort: "high", context_pct: 21, context_tokens: 210,
      cost_usd: 0, session_name: "Fix tests", updated_at: 0,
    })
  })

  test("handles streamed tool updates, errors, running input and children", () => {
    const snapshot = mapOpenCodeSnapshot({ ...base,
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
    expect(snapshot.activity?.tools).toEqual(new Map([["read", 1]]))
    expect(snapshot.activity?.failedTools).toEqual(new Map([["edit", 1]]))
    expect(snapshot.activity?.runningTools).toEqual([{ name: "bash", target: "" }, { name: "read", target: "file.ts" }])
    expect(snapshot.activity?.agents[0]).toMatchObject({ type: "explore", running: true, elapsed: null })
    expect(snapshot.activity?.mcpStatus.errored).toEqual(new Set(["bad"]))
    expect(snapshot.config?.mcps).toBe(2)
  })

  test("excludes undone messages and hides stale activity if the boundary is not loaded", () => {
    const messages = ["before", "undo"].map(id => ({ id, type: "assistant", time: { created: 1 }, content: [{ type: "tool", id: "tool", name: id, state: { status: "completed" } }] }))
    expect(mapOpenCodeSnapshot({ ...base, messages, revertMessageID: "undo" }).activity?.tools).toEqual(new Map([["before", 1]]))
    expect(mapOpenCodeSnapshot({ ...base, messages, revertMessageID: "unloaded" }).activity?.tools.size).toBe(0)
  })

  test("maps server VCS data without inventing local details", () => {
    const git = mapOpenCodeGit("/remote/repo", "main", true)
    expect(git).toMatchObject({ repo: "repo", branch: "main", dirty: true, staged: null, ahead: null })
    const snapshot = mapOpenCodeSnapshot(base)
    const remoteRows = render(snapshot, { git, worktrunk: null }, layout).output
    expect(remoteRows).toContain("main")
    // Counts unavailable from the server add no glyphs, just like measured zeros.
    const localRows = render(snapshot, {
      git: { repo: "repo", branch: "main", dirty: true, sha: "", worktree: "", isFork: false,
        staged: 0, modified: 0, untracked: 0, ahead: 0, behind: 0 },
      worktrunk: null,
    }, layout).output
    expect(remoteRows).toEqual(localRows)
    expect(mapOpenCodeGit("/remote/repo", undefined, null)).toBeNull()
  })
})

test("failed tools and failed/interrupted/unclassified children are not shown as successful", () => {
  const snapshot = mapOpenCodeSnapshot({ ...base,
    messages: [{ id: "m", type: "assistant", time: { created: 1 }, content: [{ id: "t", type: "tool", name: "edit", state: { status: "error" } }] }],
    children: [
      { id: "1", agent: "failed-agent", running: false, outcome: "failed" },
      { id: "2", agent: "interrupted-agent", running: false, outcome: "interrupted" },
      { id: "3", agent: "idle-agent", running: false },
      { id: "4", agent: "done-agent", running: false, outcome: "succeeded" },
    ],
  })
  const text = render(snapshot, EMPTY_WORKSPACE, layout).output.replace(/\x1b\[[0-9;]*m/g, "").replaceAll("\u00a0", " ")
  expect(text).toContain("✗ edit ×1")
  expect(text).toContain("✗ failed-agent")
  expect(text).toContain("■ interrupted-agent")
  expect(text).toContain("○ idle-agent")
  expect(text).toContain("✓ done-agent")
  expect(text).not.toContain("✓ edit")
})
