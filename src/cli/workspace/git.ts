import { spawnSync } from "node:child_process"
import type { GitInfo } from "../../core/workspace.ts"
import { EMPTY_GIT, parseGit, revParse, status, remotes } from "../../workspace/git.ts"

export function getGitInfo(cwd: string): GitInfo {
  const run = (args: string[]) =>
    (spawnSync("git", ["--no-optional-locks", "-C", cwd, ...args], {
      stdio: ["ignore", "pipe", "ignore"],
      encoding: "utf8",
    }).stdout ?? "").trim()
  try {
    const roots = run(revParse)
    return roots ? parseGit(roots, run(status), run(remotes)) : EMPTY_GIT
  } catch {
    return EMPTY_GIT
  }
}
