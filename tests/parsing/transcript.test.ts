import { describe, expect, test, beforeEach, afterEach } from "bun:test"
import { parseTranscript } from "../../src/parsing/transcript.ts"
import { writeFileSync, mkdirSync, rmSync } from "fs"
import { join } from "path"
import { tmpdir } from "os"

const TMP_DIR = join(tmpdir(), "claude-statusline-tests")

function writeTmpTranscript(lines: object[]): string {
  const path = join(TMP_DIR, `transcript-${Date.now()}.jsonl`)
  writeFileSync(path, lines.map(l => JSON.stringify(l)).join("\n"))
  return path
}

function toolUseEntry(id: string, name: string, input: any = {}, ts = "2025-01-01T00:00:00Z") {
  return { timestamp: ts, message: { content: [{ type: "tool_use", id, name, input }] } }
}

function toolResultEntry(toolUseId: string, isError = false, ts = "2025-01-01T00:01:00Z") {
  return { timestamp: ts, message: { content: [{ type: "tool_result", tool_use_id: toolUseId, is_error: isError }] } }
}

function assistantEntry(
  requestId: string,
  usage: {
    input_tokens?: number
    output_tokens?: number
    cache_creation_input_tokens?: number
    cache_read_input_tokens?: number
  } | null,
  ts = "2025-01-01T00:00:00Z",
  contentBlock: any = { type: "text", text: "hi" },
) {
  return {
    type: "assistant",
    requestId,
    timestamp: ts,
    message: { role: "assistant", usage, content: [contentBlock] },
  }
}

beforeEach(() => {
  mkdirSync(TMP_DIR, { recursive: true })
})

afterEach(() => {
  rmSync(TMP_DIR, { recursive: true, force: true })
})

describe("parseTranscript", () => {
  test("returns null for non-existent file", () => {
    expect(parseTranscript("/nonexistent/path.jsonl")).toBeNull()
  })

  test("returns empty data for empty transcript", () => {
    const path = writeTmpTranscript([])
    const result = parseTranscript(path)
    expect(result).not.toBeNull()
    expect(result!.tools.size).toBe(0)
    expect(result!.runningTools.length).toBe(0)
    expect(result!.agents.length).toBe(0)
    expect(result!.todos.total).toBe(0)
  })

  test("tracks completed tool usage counts", () => {
    const path = writeTmpTranscript([
      toolUseEntry("1", "Read", { file_path: "/a.ts" }),
      toolResultEntry("1"),
      toolUseEntry("2", "Read", { file_path: "/b.ts" }),
      toolResultEntry("2"),
      toolUseEntry("3", "Edit", { file_path: "/c.ts" }),
      toolResultEntry("3"),
    ])
    const result = parseTranscript(path)!
    expect(result.tools.get("read")).toBe(2)
    expect(result.tools.get("edit")).toBe(1)
  })

  test("excludes hidden tools from counts", () => {
    const path = writeTmpTranscript([
      toolUseEntry("1", "TodoWrite", { todos: [] }),
      toolResultEntry("1"),
      toolUseEntry("2", "ToolSearch", {}),
      toolResultEntry("2"),
      toolUseEntry("3", "Read", {}),
      toolResultEntry("3"),
    ])
    const result = parseTranscript(path)!
    expect(result.tools.has("todowrite")).toBe(false)
    expect(result.tools.has("toolsearch")).toBe(false)
    expect(result.tools.get("read")).toBe(1)
  })

  test("excludes Agent/Task from tool counts", () => {
    const path = writeTmpTranscript([
      toolUseEntry("1", "Agent", { description: "test agent" }),
      toolResultEntry("1"),
    ])
    const result = parseTranscript(path)!
    expect(result.tools.has("agent")).toBe(false)
  })

  test("tracks running tools (no result yet)", () => {
    const path = writeTmpTranscript([
      toolUseEntry("1", "Read", { file_path: "/a.ts" }),
      toolUseEntry("2", "Bash", { command: "npm test" }),
    ])
    const result = parseTranscript(path)!
    expect(result.runningTools.length).toBe(2)
    expect(result.runningTools[0].name).toBe("read")
    expect(result.runningTools[0].target).toBe("a.ts")
    expect(result.runningTools[1].name).toBe("bash")
  })

  test("groups MCP tools by server name", () => {
    const path = writeTmpTranscript([
      toolUseEntry("1", "mcp__github__search", {}),
      toolResultEntry("1"),
      toolUseEntry("2", "mcp__github__create_pr", {}),
      toolResultEntry("2"),
    ])
    const result = parseTranscript(path)!
    // MCP tools are grouped by server name in display (server name only)
    expect(result.tools.has("github")).toBe(true)
    expect(result.tools.get("github")).toBe(2)
    expect(result.mcpStatus.ok.has("github")).toBe(true)
  })

  test("tracks MCP errors", () => {
    const path = writeTmpTranscript([
      toolUseEntry("1", "mcp__slack__send", {}),
      toolResultEntry("1", true),
    ])
    const result = parseTranscript(path)!
    expect(result.mcpStatus.errored.has("slack")).toBe(true)
  })

  test("tracks agents (last 3)", () => {
    const path = writeTmpTranscript([
      toolUseEntry("a1", "Agent", { description: "first" }, "2025-01-01T00:00:00Z"),
      toolResultEntry("a1", false, "2025-01-01T00:01:00Z"),
      toolUseEntry("a2", "Agent", { description: "second" }, "2025-01-01T00:02:00Z"),
      toolResultEntry("a2", false, "2025-01-01T00:03:00Z"),
      toolUseEntry("a3", "Agent", { description: "third" }, "2025-01-01T00:04:00Z"),
      toolResultEntry("a3", false, "2025-01-01T00:05:00Z"),
      toolUseEntry("a4", "Agent", { description: "fourth" }, "2025-01-01T00:06:00Z"),
      toolResultEntry("a4", false, "2025-01-01T00:07:00Z"),
    ])
    const result = parseTranscript(path)!
    expect(result.agents.length).toBe(3)
    expect(result.agents[0].type).toBe("second")
    expect(result.agents[2].type).toBe("fourth")
  })

  test("tracks running agent", () => {
    const path = writeTmpTranscript([
      toolUseEntry("a1", "Agent", { description: "exploring" }, "2025-01-01T00:00:00Z"),
    ])
    const result = parseTranscript(path)!
    expect(result.agents.length).toBe(1)
    expect(result.agents[0].running).toBe(true)
    expect(result.agents[0].type).toBe("exploring")
  })

  test("tracks todo progress from TodoWrite", () => {
    const path = writeTmpTranscript([
      toolUseEntry("1", "TodoWrite", {
        todos: [
          { content: "Task A", status: "completed" },
          { content: "Task B", status: "in_progress" },
          { content: "Task C", status: "pending" },
        ],
      }),
      toolResultEntry("1"),
    ])
    const result = parseTranscript(path)!
    expect(result.todos.total).toBe(3)
    expect(result.todos.completed).toBe(1)
    expect(result.todos.current).toBe("Task B")
  })

  test("TodoWrite replaces previous todo state", () => {
    const path = writeTmpTranscript([
      toolUseEntry("1", "TodoWrite", {
        todos: [{ content: "Old task", status: "pending" }],
      }),
      toolResultEntry("1"),
      toolUseEntry("2", "TodoWrite", {
        todos: [{ content: "New task", status: "in_progress" }],
      }),
      toolResultEntry("2"),
    ])
    const result = parseTranscript(path)!
    expect(result.todos.total).toBe(1)
    expect(result.todos.current).toBe("New task")
  })

  test("sorts tools by count descending", () => {
    const path = writeTmpTranscript([
      toolUseEntry("1", "Read", {}), toolResultEntry("1"),
      toolUseEntry("2", "Edit", {}), toolResultEntry("2"),
      toolUseEntry("3", "Read", {}), toolResultEntry("3"),
      toolUseEntry("4", "Read", {}), toolResultEntry("4"),
      toolUseEntry("5", "Edit", {}), toolResultEntry("5"),
      toolUseEntry("6", "Bash", {}), toolResultEntry("6"),
    ])
    const result = parseTranscript(path)!
    const keys = [...result.tools.keys()]
    expect(keys[0]).toBe("read")  // 3 times
    expect(keys[1]).toBe("edit")  // 2 times
    expect(keys[2]).toBe("bash")  // 1 time
  })

  test("sums per-turn token usage into tokenTotals", () => {
    const path = writeTmpTranscript([
      assistantEntry("req-1", { input_tokens: 100, output_tokens: 50, cache_creation_input_tokens: 200, cache_read_input_tokens: 300 }),
      assistantEntry("req-2", { input_tokens: 10, output_tokens: 5, cache_creation_input_tokens: 20, cache_read_input_tokens: 30 }, "2025-01-01T00:01:00Z"),
    ])
    const result = parseTranscript(path)!
    expect(result.tokenTotals.input).toBe(110)
    expect(result.tokenTotals.output).toBe(55)
    expect(result.tokenTotals.cacheCreate).toBe(220)
    expect(result.tokenTotals.cacheRead).toBe(330)
  })

  test("dedupes usage by requestId (multi-record turn counts once)", () => {
    // A single assistant turn shows up across 3 JSONL records (thinking, text, tool_use),
    // each carrying the same usage block. Summing must count it once.
    const usage = { input_tokens: 100, output_tokens: 50, cache_creation_input_tokens: 200, cache_read_input_tokens: 300 }
    const path = writeTmpTranscript([
      assistantEntry("req-1", usage, "2025-01-01T00:00:00Z", { type: "thinking", thinking: "" }),
      assistantEntry("req-1", usage, "2025-01-01T00:00:01Z", { type: "text", text: "hi" }),
      assistantEntry("req-1", usage, "2025-01-01T00:00:02Z", { type: "tool_use", id: "x", name: "Read", input: {} }),
    ])
    const result = parseTranscript(path)!
    expect(result.tokenTotals.input).toBe(100)
    expect(result.tokenTotals.output).toBe(50)
    expect(result.assistantSamples.length).toBe(1)
  })

  test("defaults missing usage fields to 0", () => {
    const path = writeTmpTranscript([
      assistantEntry("req-1", { input_tokens: 100 }),  // output, cache fields missing
      assistantEntry("req-2", null, "2025-01-01T00:01:00Z"),  // entire usage missing
    ])
    const result = parseTranscript(path)!
    expect(result.tokenTotals.input).toBe(100)
    expect(result.tokenTotals.output).toBe(0)
    expect(result.tokenTotals.cacheCreate).toBe(0)
    expect(result.tokenTotals.cacheRead).toBe(0)
  })

  test("captures the most recent assistant timestamp", () => {
    const path = writeTmpTranscript([
      assistantEntry("req-1", { output_tokens: 10 }, "2025-01-01T00:00:00Z"),
      assistantEntry("req-2", { output_tokens: 10 }, "2025-01-01T00:05:00Z"),
      assistantEntry("req-3", { output_tokens: 10 }, "2025-01-01T00:02:00Z"),
    ])
    const result = parseTranscript(path)!
    // Last entry processed wins, not the chronologically latest — parser order.
    expect(result.lastAssistantTimestamp).toBe(new Date("2025-01-01T00:02:00Z").getTime())
  })

  test("caps assistantSamples sliding window at 16", () => {
    const lines = Array.from({ length: 25 }, (_, i) =>
      assistantEntry(`req-${i}`, { output_tokens: 10 }, `2025-01-01T00:${String(i).padStart(2, "0")}:00Z`),
    )
    const path = writeTmpTranscript(lines)
    const result = parseTranscript(path)!
    expect(result.assistantSamples.length).toBe(16)
    // Oldest dropped — first sample should be from turn index 9 (25 - 16 = 9).
    const expectedFirstTs = new Date("2025-01-01T00:09:00Z").getTime()
    expect(result.assistantSamples[0].t).toBe(expectedFirstTs)
  })

  test("sample.output is cumulative across turns", () => {
    const path = writeTmpTranscript([
      assistantEntry("req-1", { output_tokens: 100 }, "2025-01-01T00:00:00Z"),
      assistantEntry("req-2", { output_tokens: 50 }, "2025-01-01T00:01:00Z"),
      assistantEntry("req-3", { output_tokens: 25 }, "2025-01-01T00:02:00Z"),
    ])
    const result = parseTranscript(path)!
    expect(result.assistantSamples[0].output).toBe(100)
    expect(result.assistantSamples[1].output).toBe(150)
    expect(result.assistantSamples[2].output).toBe(175)
  })

  test("malformed timestamp does not crash and does not produce a sample", () => {
    const path = writeTmpTranscript([
      assistantEntry("req-1", { output_tokens: 50 }, "not-a-date"),
      assistantEntry("req-2", { output_tokens: 30 }, "2025-01-01T00:00:00Z"),
    ])
    const result = parseTranscript(path)!
    // The malformed-timestamp turn still contributes to totals (data is valid).
    expect(result.tokenTotals.output).toBe(80)
    // But only the well-timestamped one produces a sample.
    expect(result.assistantSamples.length).toBe(1)
    expect(result.lastAssistantTimestamp).toBe(new Date("2025-01-01T00:00:00Z").getTime())
  })

  test("empty transcript yields zeroed token totals and no samples", () => {
    const path = writeTmpTranscript([])
    const result = parseTranscript(path)!
    expect(result.tokenTotals).toEqual({ input: 0, output: 0, cacheCreate: 0, cacheRead: 0 })
    expect(result.assistantSamples).toEqual([])
    expect(result.lastAssistantTimestamp).toBeNull()
  })
})
