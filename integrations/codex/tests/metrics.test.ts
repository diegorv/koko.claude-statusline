import { expect, setSystemTime, test } from "bun:test"
import { reply, resourceUri } from "../protocol.ts"
import { mapCodexSnapshot } from "../adapter.ts"

type Node = string | { children: Node[] }
const visible = (node: Node): string => typeof node === "string" ? node : node.children.map(visible).join("")

function groups(thread: object, buckets: object[] = []): string[] {
  const response = reply(JSON.stringify({ jsonrpc: "2.0", id: 1, method: "resources/read", params: {
    uri: resourceUri, _meta: { "com.openai/codex-statusline-state": { thread, account: { rate_limits: buckets } } },
  } }))
  if (!response || !("result" in response)) throw new Error("resource read failed")
  const { contents } = response.result as { contents: [{ text: string }] }
  return (JSON.parse(contents[0].text)?.children ?? []).map(visible)
}

test("reads partial context independently for threads sharing a directory", () => {
  const thread = { id: "A", workspace: { cwd: "/shared" }, model: { display_name: "M" }, agent: { state: "ready" } }
  expect(groups({ ...thread, usage: { total: { total_input_tokens: 9999 } } })).toEqual(["M", "ready", "A"])
  expect(groups({ ...thread, usage: { context: { used_tokens: 0 } } })).toEqual(["M", "ctx 0 used", "ready", "A"])
  expect(groups({ ...thread, id: "B", usage: { context: { context_window_size: 200000 } } }))
    .toEqual(["M", "ctx 200k cap", "ready", "B"])
  expect(groups({ ...thread, usage: { context: { used_percentage: 0, used_tokens: 0, context_window_size: 0 } } }))
    .toEqual(["M", "ctx ░░░░ 0% 0/0", "ready", "A"])
})

test("reads quota identities and durations in either slot, with saturated usage and live reset countdowns", () => {
  const now = 1800000000
  const window = (used_percent: number, window_minutes: number | null, resets_at: number | null) =>
    ({ used_percent, window_minutes, resets_at })
  const codex = { limit_id: "codex", limit_name: "Plan", primary_limit: window(0, 10080, null), secondary_limit: window(103.5, 300, now + 120) }
  const other = { limit_id: "review", limit_name: "Plan", primary_limit: window(50, 45, null), secondary_limit: window(10, null, null) }
  const thread = { id: "T", agent: { state: "working" } }
  try {
    setSystemTime(new Date(now * 1000))
    const first = groups(thread, [codex, other])
    expect(first).toEqual(["codex 5h ████ 103.5% used (2m)", "codex 7d ░░░░ 0% used",
      "review 45m ██░░ 50% used", "review secondary ░░░░ 10% used", "working", "T"])
    expect(groups(thread, [{ ...codex, primary_limit: codex.secondary_limit, secondary_limit: codex.primary_limit }, other])).toEqual(first)
    setSystemTime(new Date((now + 60) * 1000))
    expect(groups(thread, [codex])[0]).toBe("codex 5h ████ 103.5% used (1m)")
    expect(groups({ id: "U" })).toEqual(["U"])
    const { data } = mapCodexSnapshot({ account: { rate_limits: [codex] } })
    expect(data.rateLimits).toMatchObject([
      { limitId: "codex", windowMinutes: 300, resetsAt: now + 120 },
      { limitId: "codex", windowMinutes: 10080, resetsAt: null },
    ])
  } finally {
    setSystemTime()
  }
})
