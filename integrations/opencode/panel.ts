import { createEffect, createMemo, createSignal, onCleanup } from "solid-js"
import { mapOpenCodeSnapshot } from "./mapping/adapter.ts"
import type { OpenCodeInput } from "./mapping/input.ts"
import type { SessionData } from "../../src/core/model.ts"
import type { WorkspaceSnapshot } from "../../src/core/workspace.ts"
import { resolveLayout } from "../../src/ui/layout.ts"
import { render } from "../../src/ui/render.ts"
import { ansiSpans } from "./ansi.ts"

export function createPanel(
  readInput: () => OpenCodeInput,
  readWorkspace: () => WorkspaceSnapshot,
  writeHeader: (data: SessionData) => void,
) {
  const snapshot = createMemo(() => mapOpenCodeSnapshot(readInput()))
  const [width, setWidth] = createSignal(0)
  const content = createMemo(() => {
    const columns = Math.floor(width())
    if (columns <= 0) return []
    const layout = resolveLayout(columns, { rightMargin: 0, frameWidth: "available" }, process.env)
    return ansiSpans(render(snapshot(), readWorkspace(), layout).output)
  })

  let pending: ReturnType<typeof setTimeout> | undefined
  createEffect(() => {
    snapshot()
    if (pending) return
    pending = setTimeout(() => {
      pending = undefined
      writeHeader(snapshot().data)
    }, 250)
  })
  onCleanup(() => { if (pending) clearTimeout(pending) })
  return { content, setWidth }
}
