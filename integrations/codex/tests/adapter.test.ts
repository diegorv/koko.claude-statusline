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
