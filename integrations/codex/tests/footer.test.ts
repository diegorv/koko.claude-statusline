import { expect, test } from "bun:test"
import { encodeGroups } from "../footer.ts"
import type { ContentGroup } from "../../../src/ui/content/session.ts"

type Node = string | { type: string; children: Node[] }
function measure(value: Node, depth = 0): { nodes: number; text: number; depth: number } {
  if (typeof value === "string") return { nodes: 1, text: Buffer.byteLength(value), depth }
  const descendants = value.children.map(n => measure(n, depth + 1))
  return {
    nodes: 1 + descendants.reduce((sum, n) => sum + n.nodes, 0),
    text: descendants.reduce((sum, n) => sum + n.text, 0),
    depth: Math.max(depth, ...descendants.map(n => n.depth)),
  }
}

test("bounded native UI keeps the first group and whole Unicode scalars", () => {
  for (const source of ["🚀".repeat(6000), "\\".repeat(9000), "short"]) {
    const group: ContentGroup = { kind: "model", spans: [{ text: source, style: "cyan" }] }
    const json = encodeGroups([group, ...Array<ContentGroup>(300).fill(group)])
    const tree = JSON.parse(json)
    const size = measure(tree)
    expect(tree.children.length).toBeGreaterThan(0)
    expect(size.nodes).toBeLessThanOrEqual(256)
    expect(size.text).toBeLessThanOrEqual(16 * 1024)
    expect(Buffer.byteLength(json)).toBeLessThanOrEqual(64 * 1024)
    expect(size.depth).toBeLessThanOrEqual(16)
    expect(tree.children[0].children[0].children[0].isWellFormed()).toBe(true)
  }
})
