import type { AgentSnapshot } from "../../src/core/snapshot.ts"
import { tokenContent } from "../../src/ui/content/consumption.ts"
import { contextContent, quotaContent } from "../../src/ui/content/metrics.ts"
import { costContent, effortContent, modelContent, sessionContent, stateContent, type ContentGroup } from "../../src/ui/content/session.ts"

type TextNode = { type: "text"; props?: { color: string }; children: (string | TextNode)[] }
type Row = { type: "row"; props: { gap: number; wrap: "wrap" }; children: TextNode[] }

const encoder = new TextEncoder()
const maxTextBytes = 16 * 1024
const maxJsonBytes = 64 * 1024
const maxNodes = 256

/** A bounded label leaves room for later groups. Stop on a Unicode scalar boundary. */
function label(text: string): string {
  let bytes = 0
  let result = ""
  for (const character of text) {
    const scalar = character.toWellFormed()
    bytes += encoder.encode(scalar).length
    if (bytes > 4093) return result + "…"
    result += scalar
  }
  return result
}

/** Only this backend knows Codex element types. Root → group → styled span → leaf has depth 3. */
export function encodeGroups(groups: readonly (ContentGroup | null)[]): string {
  const row: Row = { type: "row", props: { gap: 1, wrap: "wrap" }, children: [] }
  let leafBytes = 0
  let nodes = 1
  for (const group of groups) {
    if (!group) continue
    const children: TextNode[] = []
    let groupBytes = 0
    for (const span of group.spans) {
      if (!span.text) continue
      const content = label(span.text)
      groupBytes += encoder.encode(content).length
      const color = span.style === "dim" ? "status-metadata" : span.style === "amber" ? "#ffaa3c" : span.style
      children.push({ type: "text", ...(color && { props: { color } }), children: [content] })
      if (nodes + 1 + 2 * children.length > maxNodes || leafBytes + groupBytes > maxTextBytes) break
    }
    if (!children.length) continue
    const groupNodes = 1 + 2 * children.length
    if (nodes + groupNodes > maxNodes || leafBytes + groupBytes > maxTextBytes) break
    row.children.push({ type: "text", children })
    if (encoder.encode(JSON.stringify(row)).length > maxJsonBytes) {
      row.children.pop()
      break
    }
    nodes += groupNodes
    leafBytes += groupBytes
  }
  return JSON.stringify(row.children.length ? row : null)
}

export function renderFooter({ data, tokenTotals }: AgentSnapshot): string {
  const nowMs = Date.now()
  return encodeGroups([
    data.model ? modelContent(data.model) : null,
    effortContent(data.effortLevel),
    contextContent(data),
    ...data.rateLimits.map(limit => quotaContent(limit, nowMs)),
    stateContent(data.state),
    tokenContent(tokenTotals, "footer"),
    costContent(data.cost, data.costEstimated),
    sessionContent(data.sessionName ?? data.sessionId),
  ])
}
