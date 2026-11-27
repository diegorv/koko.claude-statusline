import type { TokenTotals } from "../../core/model.ts"
import { formatTokens } from "./metrics.ts"
import type { ContentGroup, StyledText } from "./session.ts"

/** Panels combine cache categories. The native footer labels each observed counter. */
export function tokenContent(totals: TokenTotals | null, presentation: "panel" | "footer"): ContentGroup | null {
  if (!totals) return null
  const { cacheCreate, cacheRead } = totals
  let { input, output } = totals
  const spans: StyledText[] = []

  if (presentation === "panel") {
    // Existing panels show both arrows once any consumption is available.
    input ??= 0
    output ??= 0
    if (!input && !output && !cacheCreate && !cacheRead) return null
  }
  if (input !== null) spans.push({ text: "↑", style: "cyan" }, { text: formatTokens(input) })
  if (output !== null) {
    if (spans.length) spans.push({ text: " " })
    spans.push({ text: "↓", style: "green" }, { text: formatTokens(output) })
  }

  let cache = ""
  if (presentation === "panel") {
    const combined = (cacheCreate ?? 0) + (cacheRead ?? 0)
    if (combined > 0) cache = "◆" + formatTokens(combined)
  } else {
    const counters = []
    if (cacheRead !== null) counters.push("read " + formatTokens(cacheRead))
    if (cacheCreate !== null) counters.push("write " + formatTokens(cacheCreate))
    if (counters.length) cache = "cache " + counters.join(" ")
  }
  if (cache) {
    if (spans.length) spans.push({ text: " " })
    spans.push({ text: cache, style: "dim" })
  }
  return spans.length ? { kind: "tokens", spans } : null
}
