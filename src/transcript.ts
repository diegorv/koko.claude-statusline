// Parse transcript JSONL for tool usage, agents, and todos

import { readFileSync } from "fs"

export interface AgentInfo {
  type: string
  description: string
  running: boolean
  elapsed: number // ms
}

export interface TranscriptData {
  tools: Map<string, number>  // name → completed count
  agents: AgentInfo[]
  todos: { total: number; completed: number; current: string | null }
}

const HIDDEN_TOOLS = new Set([
  "TodoWrite", "TaskCreate", "TaskUpdate", "ToolSearch",
])

export function parseTranscript(path: string): TranscriptData | null {
  let text: string
  try {
    text = readFileSync(path, "utf-8")
  } catch { return null }

  // Track tool_use by id
  const toolUses = new Map<string, { name: string; ts: string }>()
  const completedIds = new Set<string>()
  const toolCounts = new Map<string, number>()

  // Agents
  const agents: { id: string; type: string; description: string; ts: string }[] = []
  const agentCompletedIds = new Map<string, string>() // id → completion timestamp

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

        toolUses.set(id, { name, ts })

        // Agent tracking
        if (name === "Agent" || name === "Task") {
          agents.push({
            id,
            type: input?.subagent_type ?? input?.description ?? "agent",
            description: input?.description ?? "",
            ts,
          })
        }

        // Todo tracking (TodoWrite replaces all)
        if (name === "TodoWrite" && input?.todos) {
          const raw = typeof input.todos === "string" ? JSON.parse(input.todos) : input.todos
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

        // Track agent completion with timestamp
        if (agents.some(a => a.id === useId)) {
          agentCompletedIds.set(useId, ts)
        }
      }
    }
  }

  // Aggregate completed tool counts (exclude hidden + agents)
  for (const [id, { name }] of toolUses) {
    if (!completedIds.has(id)) continue
    if (HIDDEN_TOOLS.has(name)) continue
    if (name === "Agent" || name === "Task") continue
    toolCounts.set(name, (toolCounts.get(name) ?? 0) + 1)
  }

  // Sort by count descending
  const sortedTools = new Map(
    [...toolCounts.entries()].sort((a, b) => b[1] - a[1])
  )

  // Build agent infos (last 3)
  const now = Date.now()
  const agentInfos: AgentInfo[] = agents.slice(-3).map(a => {
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

  return {
    tools: sortedTools,
    agents: agentInfos,
    todos: todoData,
  }
}
