import { expect, test } from "bun:test"
import type { SessionMessageInfo } from "@opencode/client"
import { activeContext, resolveModel } from "../host.ts"

const selected = { providerID: "provider", modelID: "model" }
const models = [{ id: "model", modelID: "model", providerID: "provider", name: "Model", limit: { context: 1000, output: 200 } }]
function assistant(id: string, input: number): SessionMessageInfo {
  return { id, type: "assistant", agent: "build", model: { id: "model", providerID: "provider" }, content: [], time: { created: 1 }, tokens: { input, output: 0, reasoning: 0, cache: { read: 0, write: 0 } } }
}

test("uses native compaction and undo boundaries instead of stale context usage", () => {
  const messages = [assistant("before", 800), assistant("latest", 900)]
  expect(activeContext(messages, selected, models)?.tokens.input).toBe(900)
  expect(activeContext(messages, selected, models, "latest")?.tokens.input).toBe(800)
  expect(activeContext(messages, selected, models, "missing")).toBeUndefined()
  const compact: SessionMessageInfo = { id: "compact", type: "compaction", status: "completed", reason: "manual", summary: "summary", time: { created: 2 } }
  expect(activeContext([...messages, compact], selected, models)).toBeUndefined()
  expect(activeContext([...messages, compact, assistant("after", 50)], selected, models)?.tokens.input).toBe(50)
})

test("does not combine old usage with an unrelated newly selected model", () => {
  expect(activeContext([assistant("m", 800)], { ...selected, modelID: "other" }, models)).toBeUndefined()
  expect(activeContext([assistant("m", 800)], undefined, models)).toBeUndefined()
  expect(activeContext([assistant("m", 800)], selected, [])).toBeUndefined()
})

test("matches public model identities, not provider wire aliases", () => {
  const catalog = [
    { id: "alias", modelID: "model", providerID: "provider", name: "Alias", limit: { context: 100000, output: 1000 } },
    { id: "model", modelID: "model", providerID: "provider", name: "Model", limit: { context: 8000, output: 1000 } },
  ]
  expect(activeContext([assistant("m", 800)], selected, catalog)?.limit).toBe(8000)
  expect(resolveModel(selected, catalog)?.name).toBe("Model")
  expect(activeContext([assistant("m", 800)], { ...selected, modelID: "alias" }, catalog)).toBeUndefined()
})
