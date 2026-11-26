import type { AgentAdapter } from "../../core/adapter.ts"
import type { ActivityData, EffortLevel } from "../../core/model.ts"
import type { OpenCodeInput, Usage } from "./input.ts"

const clean = (text: string) => text.replace(/[\x00-\x1f\x7f]/g, "")
const count = (value: number | undefined) => typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : 0

function effort(variant?: string): EffortLevel | null {
  switch (variant) {
    case "low": case "medium": case "high": case "xhigh": case "max": return variant
    default: return null
  }
}

function tokenTotals(usage?: Usage) {
  return {
    input: count(usage?.input), output: count(usage?.output) + count(usage?.reasoning),
    cacheRead: count(usage?.cache.read), cacheCreate: count(usage?.cache.write),
  }
}

function activity(input: OpenCodeInput): ActivityData {
  const tools = new Map<string, number>()
  const failedTools = new Map<string, number>()
  const runningTools: ActivityData["runningTools"] = []
  // Cached messages replace streamed revisions; dedupe defensively by message/tool ID.
  const messages = [...new Map(input.messages.map(message => [message.id, message])).values()]
  const boundary = input.revertMessageID ? messages.findIndex(message => message.id === input.revertMessageID) : messages.length
  const visible = boundary < 0 ? [] : messages.slice(0, boundary)
  const seen = new Set<string>()
  for (const message of visible) {
    if (message.type !== "assistant") continue
    for (const part of message.content ?? []) {
      if (part.type !== "tool" || !part.id || !part.name || !part.state) continue
      const key = `${message.id}:${part.id}`
      if (seen.has(key)) continue
      seen.add(key)
      const name = clean(part.name)
      if (part.state.status === "running" || part.state.status === "streaming") {
        const args = typeof part.state.input === "object" ? part.state.input : undefined
        const rawTarget = args?.filePath ?? args?.path ?? args?.command
        runningTools.push({ name, target: typeof rawTarget === "string" ? clean(rawTarget).slice(0, 40) : "" })
      } else if (part.state.status === "completed") {
        tools.set(name, (tools.get(name) ?? 0) + 1)
      } else if (part.state.status === "error") {
        failedTools.set(name, (failedTools.get(name) ?? 0) + 1)
      }
    }
  }
  const mcps = input.mcps ?? []
  return {
    tools, failedTools, runningTools: runningTools.slice(-2),
    agents: input.children.map(child => ({ type: clean(child.agent ?? child.title ?? child.id), description: clean(child.title ?? ""), running: child.running, elapsed: null, outcome: child.running ? undefined : child.outcome ?? "unknown" })),
    todos: { total: 0, completed: 0, current: null },
    mcpStatus: {
      ok: new Set(mcps.filter(server => server.status.status === "connected").map(server => server.name)),
      errored: new Set(mcps.filter(server => server.status.status === "failed").map(server => server.name)),
    },
    tokenTotals: tokenTotals(input.session?.tokens),
    lastAssistantTimestamp: null,
    assistantSamples: [],
  }
}

export const opencodeAdapter: AgentAdapter<OpenCodeInput> = {
  id: "opencode",
  read(input) {
    const usage = input.context?.tokens
    // OpenCode v2 TokenUsageInfo reports visible output and reasoning separately.
    const tokens = usage ? count(usage.input) + count(usage.output) + count(usage.reasoning) + count(usage.cache.read) + count(usage.cache.write) : null
    const capacity = input.context?.limit && input.context.limit > 0 ? input.context.limit : null
    return {
      data: {
        agent: "opencode", model: clean(input.model?.name ?? "OpenCode"), modelId: input.model?.id ?? "",
        effortLevel: effort(input.model?.variant),
        terminalWidth: Math.max(1, Math.floor(input.width)), rightMargin: 0, frameWidth: "available",
        contextPercent: tokens !== null && capacity !== null ? Math.min(100, tokens / capacity * 100) : null,
        contextTokens: tokens, contextWindowSize: capacity,
        cost: input.cost !== undefined && Number.isFinite(input.cost) && input.cost >= 0 ? input.cost : null,
        costEstimated: null,
        durationMs: null, linesAdded: null, linesRemoved: null,
        cwd: input.directory, sessionId: input.session?.id ?? null, sessionName: input.session?.title ? clean(input.session.title) : null,
        state: input.status ?? null, rateLimits: [],
        vimMode: null, worktree: null, transcriptPath: null, outputStyle: null,
      },
      config: input.mcps ? { instructionFiles: [], rules: 0, hooks: 0, mcps: input.mcps.length } : null,
      activity: activity(input), skipPermissions: false, headerBadges: [],
    }
  },
}
