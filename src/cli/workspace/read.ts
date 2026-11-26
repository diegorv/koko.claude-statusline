import type { WorkspaceSnapshot } from "../../core/workspace.ts"
import { getGitInfo } from "./git.ts"
import { getWorktrunkInfo } from "./worktrunk.ts"

export function readLocalWorkspace(cwd: string): WorkspaceSnapshot {
  const git = cwd ? getGitInfo(cwd) : null
  // Worktrunk costs about 100 ms. Its details apply only to linked worktrees.
  return { git, worktrunk: git?.worktree ? getWorktrunkInfo(cwd) : null }
}
