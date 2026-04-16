// Parse transcript JSONL for tool usage, agents, and todos

import { readFileSync } from "fs"

export interface AgentInfo {
  type: string
  description: string
  running: boolean
  elapsed: number // ms
}

export interface RunningTool {
  name: string
  target: string
}

export interface McpStatus {
  ok: Set<string>      // servers with at least one successful call
  errored: Set<string> // servers with at least one error
}

export interface TranscriptData {
  tools: Map<string, number>  // name → completed count
  runningTools: RunningTool[]  // currently running tools
  agents: AgentInfo[]
  todos: { total: number; completed: number; current: string | null }
  mcpStatus: McpStatus
}

const HIDDEN_TOOLS = new Set([
  "TodoWrite", "TaskCreate", "TaskUpdate", "ToolSearch",
])

function mcpDisplayName(name: string): string {
  if (!name.startsWith("mcp__")) return name.toLowerCase()
  const parts = name.split("__")
  // mcp__server__tool → "server", mcp__server_name__tool → "server_name"
  return parts.length >= 3 ? parts.slice(1, -1).join(".") : parts[1]
}

function extractTarget(name: string, input: any): string {
  if (!input) return ""
  if (name === "Read" || name === "Write" || name === "Edit")
    return (input.file_path ?? input.path ?? "").split("/").pop() ?? ""
  if (name === "Glob" || name === "Grep")
    return input.pattern ?? ""
  if (name === "Bash")
    return (input.command ?? "").slice(0, 30)
  if (name === "Skill")
    return input.skill ?? ""
  return ""
}

/**
 * Parses a Claude Code transcript JSONL file and extracts tool usage, agent tracking,
 * todo progress, and MCP server health in a single pass.
 * @param path - Absolute path to the transcript JSONL file.
 * @returns Parsed transcript data, or null if the file cannot be read.
 */
export function parseTranscript(path: string): TranscriptData | null {
  let text: string
  try {
    text = readFileSync(path, "utf-8")
  } catch { return null }

  // Track tool_use by id — stores name + input for running tool display
  const toolUses = new Map<string, { name: string; input: any }>()
  const completedIds = new Set<string>()
  const toolCounts = new Map<string, number>()

  // Agents — Set for O(1) lookup instead of array.some()
  const agents: { id: string; type: string; description: string; ts: string }[] = []
  const agentIds = new Set<string>()
  const agentCompletedIds = new Map<string, string>() // id → completion timestamp

  // MCP status
  const mcpOk = new Set<string>()
  const mcpErrored = new Set<string>()

  // Todos
  let todos: { content: string; status: string }[] = []

  for (const line of text.split("\n")) {
    if (!line) continue
    let entry: any
    try { entry = JSON.parse(line) } catch { continue }

    const blocks = entry?.message?.content
    if (!Array.isArray(blocks)) continue
    const ts = entry.timestamp ?? ""

    for (const block of blocks) {
      if (block.type === "tool_use") {
        const { id, name, input } = block

        toolUses.set(id, { name, input })

        // Agent tracking (keep last 3 to bound memory)
        if (name === "Agent" || name === "Task") {
          if (agents.length >= 3) agents.shift()
          agents.push({
            id,
            type: input?.subagent_type ?? input?.description ?? "agent",
            description: input?.description ?? "",
            ts,
          })
          agentIds.add(id)
        }

        // Todo tracking (TodoWrite replaces all)
        if (name === "TodoWrite" && input?.todos) {
          let raw: any
          try {
            raw = typeof input.todos === "string" ? JSON.parse(input.todos) : input.todos
          } catch { continue }
          if (Array.isArray(raw)) {
            todos = raw.map((t: any) => ({
              content: t.content ?? t.subject ?? "",
              status: t.status ?? "pending",
            }))
          }
        }
      }

      if (block.type === "tool_result") {
        const useId = block.tool_use_id
        completedIds.add(useId)

        const toolInfo = toolUses.get(useId)
        if (!toolInfo) continue

        // Track agent completion with timestamp — O(1) Set lookup
        if (agentIds.has(useId)) {
          agentCompletedIds.set(useId, ts)
        }

        // Increment completed tool count inline (avoids second pass)
        const { name } = toolInfo
        if (!HIDDEN_TOOLS.has(name) && name !== "Agent" && name !== "Task") {
          const display = mcpDisplayName(name)
          toolCounts.set(display, (toolCounts.get(display) ?? 0) + 1)
        }

        // Track MCP tool results (mcp__servername__toolname)
        if (name.startsWith("mcp__")) {
          const server = name.split("__")[1]
          if (server) {
            if (block.is_error) {
              mcpErrored.add(server)
            } else {
              mcpOk.add(server)
            }
          }
        }
      }
    }
  }

  // Sort tools by count descending
  const sortedTools = new Map(
    [...toolCounts.entries()].sort((a, b) => b[1] - a[1])
  )

  // Build agent infos (already bounded to 3 during parsing)
  const now = Date.now()
  const agentInfos: AgentInfo[] = agents.map(a => {
    const running = !agentCompletedIds.has(a.id)
    const startMs = a.ts ? new Date(a.ts).getTime() : now
    const endMs = running ? now : (agentCompletedIds.get(a.id) ? new Date(agentCompletedIds.get(a.id)!).getTime() : now)
    return {
      type: a.type,
      description: a.description,
      running,
      elapsed: endMs - startMs,
    }
  })

  // Build todo progress
  const todoTotal = todos.length
  const todoCompleted = todos.filter(t => t.status === "completed").length
  const currentTodo = todos.find(t => t.status === "in_progress")
  const todoData = todoTotal > 0
    ? { total: todoTotal, completed: todoCompleted, current: currentTodo?.content ?? null }
    : { total: 0, completed: 0, current: null }

  // Build running tools (last 2, exclude hidden + agents) — single pass over uncompleted
  const runningTools: RunningTool[] = []
  for (const [id, { name, input }] of toolUses) {
    if (completedIds.has(id)) continue
    if (HIDDEN_TOOLS.has(name)) continue
    if (name === "Agent" || name === "Task") continue
    runningTools.push({ name: mcpDisplayName(name), target: extractTarget(name, input) })
  }

  return {
    tools: sortedTools,
    runningTools: runningTools.slice(-2),
    agents: agentInfos,
    todos: todoData,
    mcpStatus: { ok: mcpOk, errored: mcpErrored },
  }
}
