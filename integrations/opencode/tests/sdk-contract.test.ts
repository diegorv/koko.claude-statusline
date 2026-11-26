import { expect, test } from "bun:test"
import { lastAssistantWithUsage } from "@opencode/client/solid"
import { TokenUsage } from "@opencode/schema/token-usage"
import type { ModelInfo, SessionMessageInfo } from "@opencode/client"
import { activeContext, contextStep } from "../mapping/context.ts"
import { opencodeAdapter } from "../mapping/adapter.ts"

const usage = { input: 100, output: 20, reasoning: 10, cache: { read: 50, write: 30 } }
const assistant: SessionMessageInfo = { id: "assistant", type: "assistant", agent: "build", model: { id: "model", providerID: "p" }, tokens: usage, content: [], time: { created: 1 } }
const compact: SessionMessageInfo = { id: "compact", type: "compaction", status: "completed", reason: "manual", summary: "summary", time: { created: 2 } }
const pending: SessionMessageInfo = { ...assistant, id: "pending", tokens: undefined }

test("local context selector agrees with pinned SDK across compaction and undo", () => {
  for (const messages of [[], [assistant], [assistant, compact], [assistant, compact, pending], [compact, assistant, pending]]) {
    for (const boundary of [undefined, "assistant", "compact", "pending", "missing"]) {
      const expected = lastAssistantWithUsage(messages, boundary)
      expect(contextStep(messages, boundary)).toEqual(expected ? { tokens: expected.tokens, model: expected.model } : undefined)
    }
  }
})

test("context total agrees with the host's TokenUsageInfo contract", () => {
  const snapshot = opencodeAdapter.read({ directory: "/repo", context: { tokens: usage, limit: 1000 }, messages: [], children: [] })
  expect(snapshot.data.contextTokens).toBe(TokenUsage.total(usage))
})

test("uses the pinned SDK's active usage with the matching model's context capacity", () => {
  const catalog = [
    { id: "model", providerID: "p", name: "First", limit: { context: 1000, output: 200 } },
    { id: "next", providerID: "p", name: "Next", limit: { context: 2000, output: 200 } },
  ] satisfies Pick<ModelInfo, "id" | "providerID" | "name" | "limit">[]
  const next: SessionMessageInfo = { ...assistant, id: "second", model: { id: "next", providerID: "p" } }
  const messages = [assistant, next]
  for (const boundary of [undefined, "second"]) {
    const current = lastAssistantWithUsage(messages, boundary)
    for (const model of catalog) {
      const selected = { providerID: model.providerID, modelID: model.id }
      const context = activeContext(messages, selected, catalog, boundary)
      const expected = current?.model.id === model.id ? { tokens: current.tokens, limit: model.limit.context } : undefined
      expect(context).toEqual(expected)
    }
  }
})
