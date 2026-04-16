// Git repository info

export interface GitInfo {
  repo: string
  branch: string
  dirty: boolean
  staged: number
  modified: number
  untracked: number
  ahead: number
  behind: number
}

const EMPTY: GitInfo = {
  repo: "", branch: "", dirty: false,
  staged: 0, modified: 0, untracked: 0,
  ahead: 0, behind: 0,
}

/**
 * Collects git repository status for the given working directory.
 * Uses 2 git spawns: rev-parse (repo name) and status -b --porcelain (branch + status + ahead/behind).
 * @param cwd - Working directory path.
 * @returns Git info object, or empty defaults if not a git repo.
 */
export function getGitInfo(cwd: string): GitInfo {
  const run = (...args: string[]) =>
    Bun.spawnSync(["git", "--no-optional-locks", "-C", cwd, ...args]).stdout.toString().trim()

  try {
    const repo = run("rev-parse", "--show-toplevel").split("/").pop() ?? ""
    if (!repo) return EMPTY

    // Single command for branch, ahead/behind, and file status
    const output = run("status", "-b", "--porcelain")
    const lines = output.split("\n")

    // First line: ## branch...upstream [ahead N, behind M]
    const headerLine = lines[0] ?? ""
    let branch = ""
    let ahead = 0, behind = 0

    if (headerLine.startsWith("## ")) {
      const header = headerLine.slice(3)
      // Parse "branch...upstream [ahead 2, behind 1]" or just "branch"
      const dotIdx = header.indexOf("...")
      branch = dotIdx >= 0 ? header.slice(0, dotIdx) : header.split(" ")[0]

      const bracketMatch = header.match(/\[(.+)\]/)
      if (bracketMatch) {
        const aheadMatch = bracketMatch[1].match(/ahead (\d+)/)
        const behindMatch = bracketMatch[1].match(/behind (\d+)/)
        if (aheadMatch) ahead = parseInt(aheadMatch[1], 10)
        if (behindMatch) behind = parseInt(behindMatch[1], 10)
      }
    }

    // Remaining lines: XY filename
    let staged = 0, modified = 0, untracked = 0
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i]
      if (!line) continue
      const x = line[0], y = line[1]
      if (x === "?" && y === "?") { untracked++; continue }
      if (x && x !== " " && x !== "?") staged++
      if (y && y !== " " && y !== "?") modified++
    }

    return {
      repo, branch,
      dirty: lines.length > 1,
      staged, modified, untracked,
      ahead, behind,
    }
  } catch {
    return EMPTY
  }
}
