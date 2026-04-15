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

export function getGitInfo(cwd: string): GitInfo {
  const run = (...args: string[]) =>
    Bun.spawnSync(["git", "--no-optional-locks", "-C", cwd, ...args]).stdout.toString().trim()

  try {
    const repo = run("rev-parse", "--show-toplevel").split("/").pop() ?? ""
    if (!repo) return EMPTY

    const branch = run("symbolic-ref", "--short", "HEAD")
    const porcelain = run("status", "--porcelain")

    // Parse status --porcelain: XY filename
    // X = staged status, Y = unstaged status
    let staged = 0, modified = 0, untracked = 0
    if (porcelain) {
      for (const line of porcelain.split("\n")) {
        const x = line[0], y = line[1]
        if (x === "?" && y === "?") { untracked++; continue }
        if (x && x !== " " && x !== "?") staged++
        if (y && y !== " " && y !== "?") modified++
      }
    }

    // Ahead/behind upstream
    let ahead = 0, behind = 0
    try {
      const ab = run("rev-list", "--left-right", "--count", "HEAD...@{upstream}")
      const [a, b] = ab.split(/\s+/)
      ahead = parseInt(a, 10) || 0
      behind = parseInt(b, 10) || 0
    } catch {} // no upstream configured

    return {
      repo, branch,
      dirty: porcelain.length > 0,
      staged, modified, untracked,
      ahead, behind,
    }
  } catch {
    return EMPTY
  }
}
