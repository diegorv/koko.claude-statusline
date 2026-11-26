import type { GitInfo } from "../../collection/git.ts"

/** Map the connected server's VCS data; never probe a remote directory locally. */
export function mapOpenCodeGit(directory: string, branch: string | undefined, dirty: boolean | null): GitInfo | null {
  if (!branch) return null
  return {
    repo: directory.replaceAll("\\", "/").replace(/\/$/, "").split("/").pop() ?? directory,
    branch: branch.replace(/[\x00-\x1f\x7f]/g, ""), dirty,
    // The public VCS API does not distinguish staged/untracked/ahead/behind.
    staged: null, modified: null, untracked: null, ahead: null, behind: null,
    sha: "", isFork: null, worktree: "",
  }
}
