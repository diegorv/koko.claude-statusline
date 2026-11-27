import { expect, test } from "bun:test"
import { mapCodexSnapshot } from "../adapter.ts"
import { renderFooter } from "../footer.ts"

test("uses only reported facts from this displayed thread", () => {
  const snapshot = mapCodexSnapshot({ thread: { id: "A", name: "Fix",
    model: { display_name: "GPT", id: "gpt", reasoning_level: "minimal" },
    workspace: { cwd: "/work" }, agent: { state: "waiting" } } })
  expect(snapshot.data).toMatchObject({ agent: "codex", model: "GPT", effortLevel: "minimal", cwd: "/work",
    state: "waiting", sessionId: "A", sessionName: "Fix", contextPercent: null, cost: null })
  expect(snapshot.activity).toBeNull()
  expect(renderFooter(mapCodexSnapshot({ thread: { model: [], workspace: null } }))).toBe("null")
})

test("uses the model ID when no display name is supplied and omits unknown effort", () => {
  expect(mapCodexSnapshot({ thread: { model: { id: "model-id", reasoning_level: 12 } } }).data)
    .toMatchObject({ model: "model-id", effortLevel: null, state: null })
})

test("partial session consumption does not create tool or timing activity", () => {
  const snapshot = mapCodexSnapshot({ thread: { usage: {
    total: { total_input_tokens: 20, cache_read_input_tokens: 0, output_tokens: 3 },
    cost: { total_cost_usd: 0, total_credits: 123 },
  } } })
  expect(snapshot.tokenTotals).toEqual({ input: null, output: 3, cacheRead: 0, cacheCreate: null })
  expect(snapshot.activity).toBeNull()
  expect(snapshot.data).toMatchObject({ cost: 0, durationMs: null, contextTokens: null, contextPercent: null })
  expect(mapCodexSnapshot({}).tokenTotals).toBeNull()
})
