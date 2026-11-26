import assert from "node:assert/strict"
import { createRoot, createSignal } from "solid-js"
import { createPanel } from "../panel.ts"
import { EMPTY_WORKSPACE } from "../../../src/core/workspace.ts"

let reads = 0
let aggregations = 0
const writes: string[] = []
const [model, setModel] = createSignal("First")
const { panel, dispose } = createRoot(dispose => ({
  dispose,
  panel: createPanel(() => {
    reads++
    return {
      directory: "/remote", model: { id: "m", name: model() }, status: "idle", children: [],
      get messages() { aggregations++; return [] },
    }
  }, () => EMPTY_WORKSPACE, data => writes.push(data.model)),
}))

function frameWidth() {
  const lines = panel.content().map(span => span.text).join("").split("\n")
  return lines.find(line => line.includes("┌"))?.length
}

try {
  assert.deepEqual(panel.content(), [])
  await Bun.sleep(300)
  assert.deepEqual(writes, ["First"])
  assert.equal(reads, 1)
  assert.equal(aggregations, 1)

  panel.setWidth(80)
  assert.equal(frameWidth(), 75)
  delete process.env.KOKO_STATUSLINE_RIGHT_MARGIN
  panel.setWidth(120)
  assert.equal(frameWidth(), 110)
  await Bun.sleep(300)
  assert.equal(reads, 1)
  assert.equal(aggregations, 1)
  assert.deepEqual(writes, ["First"])

  setModel("Second")
  setModel("Third")
  await Bun.sleep(300)
  assert.deepEqual(writes, ["First", "Third"])
} finally {
  dispose()
}
