import { afterEach, beforeEach, expect, setSystemTime, test } from "bun:test"
import type { AgentSnapshot } from "../../src/core/snapshot.ts"
import { resolveLayout } from "../../src/ui/layout.ts"
import { render } from "../../src/ui/render.ts"

const snapshot: AgentSnapshot = {
  data: {
    agent: "antigravity", model: "模型 👩‍💻", effortLevel: "xhigh", state: "working",
    contextPercent: null, contextTokens: null, contextWindowSize: null,
    cost: 0.42, costEstimated: true, durationMs: null, linesAdded: null, linesRemoved: null,
    cwd: "", sessionName: "café", sessionId: "session", rateLimits: [], vimMode: null,
    worktree: "feature", outputStyle: null,
  },
  skipPermissions: false, config: null, activity: null, headerAnnotations: [],
}
const workspace = { git: null, worktrunk: null }

beforeEach(() => setSystemTime(new Date("2026-11-26T12:00:00Z")))
afterEach(() => setSystemTime())

test("public renderer preserves ANSI bytes in the command and measured-slot layouts", () => {
  const env = { KOKO_STATUSLINE_RIGHT_MARGIN: "2", CLAUDE_STATUSLINE_RIGHT_MARGIN: "8" }
  for (const layout of [
    resolveLayout(36, { frameWidth: "content", rightMargin: 16 }, env),
    resolveLayout(70, { frameWidth: "available", rightMargin: 0 }, env),
  ]) {
    const output = render(snapshot, workspace, layout)
    // Make byte-level differences in colors and nonbreaking spaces readable in the snapshot.
    expect({ ...output, output: output.output.replaceAll("\x1b", "␛").replaceAll("\u00a0", "␣") })
      .toMatchSnapshot(layout.frameWidth)
  }
})

test("a hyperlink in a Claude session title takes only the label's columns", () => {
  const layout = resolveLayout(52, { frameWidth: "content", rightMargin: 16 }, {})
  const withName = (sessionName: string) => render({
    ...snapshot, data: { ...snapshot.data, agent: "claude", sessionName },
  }, workspace, layout)
  const plain = withName("Release notes")
  for (const end of ["\x07", "\x1b\\"]) {
    const linked = "\x1b]8;;https://example.org/" + end + "Release notes\x1b]8;;" + end
    expect(withName(linked)).toEqual(plain)
  }
})
