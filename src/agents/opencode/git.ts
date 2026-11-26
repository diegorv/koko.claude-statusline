import type { GitInfo } from "../../collection/git.ts"

/** Map the connected server's VCS data; never probe a remote directory locally. */
export function mapOpenCodeGit(repositoryRoot: string, branch: string | undefined, dirty: boolean | null): GitInfo | null {
  if (!branch) return null
  return {
    repo: repositoryRoot.replaceAll("\\", "/").replace(/\/$/, "").split("/").pop() ?? repositoryRoot,
    branch: branch.replace(/[\x00-\x1f\x7f]/g, ""), dirty,
    // The public VCS API does not distinguish staged/untracked/ahead/behind.
    staged: null, modified: null, untracked: null, ahead: null, behind: null,
    sha: "", isFork: null, worktree: "",
  }
}
