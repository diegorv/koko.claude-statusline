export interface GitInfo {
  repo: string
  branch: string
  dirty: boolean | null
  staged: number | null
  modified: number | null
  untracked: number | null
  ahead: number | null
  behind: number | null
  /** Short SHA of HEAD (empty string when unavailable). */
  sha: string
  /** True when `origin` and `upstream` remotes belong to different owners. */
  isFork: boolean | null
  /** Folder name of a linked worktree; empty string in the main checkout. */
  worktree: string
}

export interface WorktrunkInfo {
  /** Agent activity marker set by worktrunk's Claude plugin (e.g. 🤖, 💬). */
  marker: string
  /** Commits ahead of / behind the repo's default branch. */
  ahead: number
  behind: number
  defaultBranch: string
}

export interface WorkspaceSnapshot {
  git: GitInfo | null
  worktrunk: WorktrunkInfo | null
}

export const EMPTY_WORKSPACE: WorkspaceSnapshot = { git: null, worktrunk: null }
