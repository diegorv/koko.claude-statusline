import { Plugin } from "@opencode/plugin/tui"
import { TextAttributes } from "@opentui/core"
import { createEffect, createMemo, createResource, createSignal, For, on, onCleanup } from "solid-js"
import { opencodeAdapter } from "../../src/agents/opencode/adapter.ts"
import { createWorkspaceRequests, workspaceFor } from "./workspace.ts"
import { render } from "../../src/ui/render.ts"
import { renderLines } from "../../src/ui/lines.ts"
import { exportPaneHeader } from "../../src/export/pane-header.ts"
import { ansiSpans } from "./ansi.ts"
import { readHost } from "./host.ts"

function Statusline(props: { context: Plugin.Context; sessionID?: string }) {
  const context = props.context
  const [width, setWidth] = createSignal(0)
  const location = () => context.location ?? context.data.location.default()
  const directory = () => (props.sessionID ? context.data.session.get(props.sessionID)?.location.directory : undefined) ?? location().directory

  const selection = createMemo(() => ({ directory: directory(), sessionID: props.sessionID }), undefined, {
    equals: (a, b) => a.directory === b.directory && a.sessionID === b.sessionID,
  })
  const requests = createWorkspaceRequests(context.client)
  onCleanup(requests.cancel)
  const [vcs, { refetch }] = createResource(selection, requests.load)
  const timer = setInterval(() => { void refetch() }, 5000)
  onCleanup(() => clearInterval(timer))

  createEffect(on(directory, () => {
    const loc = { directory: directory() }
    void Promise.allSettled([
      context.data.location.model.sync(loc), context.data.location.mcp.server.sync(loc),
    ])
  }))
  createEffect(on(() => props.sessionID, id => {
    if (id) void Promise.allSettled([context.data.session.sync(id), context.data.session.message.sync(id)])
  }))

  const snapshot = createMemo(() => opencodeAdapter.read(readHost(context, props.sessionID, Math.max(1, width()))))
  const content = createMemo(() => {
    if (width() <= 0) return []
    const current = snapshot()
    const workspace = workspaceFor(selection(), vcs())
    const output = renderLines(current.data, render(current, workspace), workspace.git?.repo)
    return ansiSpans(output)
  })

  let pending: ReturnType<typeof setTimeout> | undefined
  createEffect(() => {
    snapshot()
    if (pending) return
    pending = setTimeout(() => {
      pending = undefined
      const data = snapshot().data
      exportPaneHeader(process.env, data, data.effortLevel)
    }, 250)
  })
  onCleanup(() => { if (pending) clearTimeout(pending) })

  return <box width="100%" minHeight={1} flexShrink={0} onSizeChange={function () { const next = this.width; queueMicrotask(() => setWidth(next)) }}>
    <text width="100%" wrapMode="char">
      <For each={content()}>{span => <span style={{ fg: span.color ?? context.theme.text.base,
        attributes: (span.bold ? TextAttributes.BOLD : 0) | (span.dim ? TextAttributes.DIM : 0) }}>{span.text}</span>}</For>
    </text>
  </box>
}

export default Plugin.define({
  id: "koko.statusline",
  setup(context) {
    // prompt.footer is a horizontal row: a multiline statusline must use
    // column slots so it cannot steal space from the native footer controls.
    const home = context.ui.slot({ before: "home.footer", render: () => <Statusline context={context} /> })
    const session = context.ui.slot({ append: "session.composer.top", render: props => <Statusline context={context} sessionID={props.sessionID} /> })
    return () => { home(); session() }
  },
})
