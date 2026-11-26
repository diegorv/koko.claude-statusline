import { expect, test } from "bun:test"
import { ansiSpans } from "../ansi.ts"
import { gradientBar } from "../../../src/ui/format.ts"

test("preserves shared renderer colors, annotations and resets as native spans", () => {
  expect(ansiSpans("\x1b[1m\x1b[33mRepo\x1b[0m\u00a0\x1b[2mquiet\x1b[0m")).toEqual([
    { text: "Repo", color: "#e5e510", bold: true, dim: false },
    { text: " ", bold: false, dim: false },
    { text: "quiet", bold: false, dim: true },
  ])
  expect(ansiSpans("\x1b[38;5;172morange\x1b[0m")[0].color).toBe("#d78700")
  const spans = ansiSpans(gradientBar(50, 10))
  expect(spans).toHaveLength(10)
  expect(spans.map(span => span.text).join("")).toBe("█████░░░░░")
  expect(spans.every(span => span.color?.startsWith("#"))).toBe(true)
})
