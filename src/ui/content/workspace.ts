import type { GitInfo, WorktrunkInfo } from "../../core/workspace.ts"
import { displayText, type ContentGroup, type StyledText } from "./session.ts"

export function gitContent(git: GitInfo | null, wt: WorktrunkInfo | null): ContentGroup | null {
  if (!git?.repo) return null
  const spans: StyledText[] = []
  if (git.isFork) spans.push({ text: "⑂ ", style: "magenta" })
  const branch = displayText(git.branch)
  spans.push({ text: branch.length > 80 ? branch.slice(0, 77) + "..." : branch, style: "green" })
  if (git.dirty) spans.push({ text: "*", style: "yellow" })

  function counts(values: [number | null, string, StyledText["style"]][]) {
    let gap = "  "
    for (const [n, prefix, style] of values) {
      if (n !== null && n > 0) {
        spans.push({ text: gap }, { text: prefix + n, style })
        gap = " "
      }
    }
  }
  counts([[git.staged, "+", "green"], [git.modified, "~", "yellow"], [git.untracked, "?", "dim"]])
  counts([[git.ahead, "↑", "green"], [git.behind, "↓", "red"]])
  if (wt && (wt.ahead > 0 || wt.behind > 0)) {
    spans.push({ text: "  " }, { text: displayText(wt.defaultBranch || "base"), style: "dim" })
    if (wt.ahead > 0) spans.push({ text: "↑" + wt.ahead, style: "green" })
    if (wt.behind > 0) spans.push({ text: "↓" + wt.behind, style: "red" })
  }
  if (wt?.marker) spans.push({ text: "  " + displayText(wt.marker) })
  if (git.sha) spans.push({ text: "  " }, { text: displayText(git.sha), style: "dim" })
  return { kind: "git", spans }
}
