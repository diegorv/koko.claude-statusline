import { expect, test } from "bun:test"
import { costContent, effortContent, modelContent, sessionContent, stateContent } from "../../src/ui/content/session.ts"

test("session fields carry readable text and styles independently of terminal rendering", () => {
  expect(modelContent("\x1b[31m模型 👩‍💻\x1b[0m")).toEqual({
    kind: "model", spans: [{ text: "模型 👩‍💻", style: "cyan" }],
  })
  expect(effortContent("high")).toEqual({
    kind: "effort", spans: [{ text: "effort: ", style: "dim" }, { text: "high", style: "green" }],
  })
  expect(stateContent("working")).toEqual({ kind: "state", spans: [{ text: "working" }] })
  expect(sessionContent("café")).toEqual({ kind: "session", spans: [{ text: "café" }] })
  expect(costContent(0, false)?.spans).toEqual([{ text: "0¢", style: "yellow" }])
  expect(costContent(1.5, true)?.spans).toEqual([{ text: "~$1.50", style: "yellow" }])
  expect([effortContent(null), stateContent(null), sessionContent(null), costContent(null, null)])
    .toEqual([null, null, null, null])
})

test("terminal control strings leave only the visible field text", () => {
  for (const [osc, end] of [["\x1b]", "\x07"], ["\x1b]", "\x1b\\"], ["\x9d", "\x9c"]]) {
    const title = osc + "8;;https://example.org/" + end + "Release notes" + osc + "8;;" + end
    expect(sessionContent(title)?.spans).toEqual([{ text: "Release notes" }])
  }
  expect(stateContent("busy\x1bPprivate\x1b\\!")?.spans).toEqual([{ text: "busy!" }])
  expect(modelContent("Model\x1b]unterminated").spans[0].text).toBe("Model")
})
