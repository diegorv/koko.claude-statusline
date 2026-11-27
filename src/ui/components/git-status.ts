import type { GitInfo, WorktrunkInfo } from "../../core/workspace.ts"
import { gitContent } from "../content/workspace.ts"
import { ansiContent } from "../format.ts"

export function renderGitStatus(git: GitInfo, wt: WorktrunkInfo | null = null): string {
  const group = gitContent(git, wt)
  return group ? ansiContent(group) : ""
}
