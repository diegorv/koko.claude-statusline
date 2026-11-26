import { expect, test } from "bun:test"
import { lastAssistantWithUsage } from "@opencode/client/solid"
import { TokenUsage } from "@opencode/schema/token-usage"
import type { SessionMessageInfo } from "@opencode/client"
import { contextStep } from "../../../src/agents/opencode/context.ts"
import { opencodeAdapter } from "../../../src/agents/opencode/adapter.ts"

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
  const snapshot = opencodeAdapter.read({ directory: "/repo", width: 100, context: { tokens: usage, limit: 1000 }, messages: [], children: [] })
  expect(snapshot.data.contextTokens).toBe(TokenUsage.total(usage))
})
