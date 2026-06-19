// Git repository info

import { spawnSync } from "node:child_process"

export interface GitInfo {
  repo: string
  branch: string
  dirty: boolean
  staged: number
  modified: number
  untracked: number
  ahead: number
  behind: number
  /** Short SHA of HEAD (empty string when unavailable). */
  sha: string
  /** True when `origin` and `upstream` remotes belong to different owners. */
  isFork: boolean
}

const EMPTY: GitInfo = {
  repo: "", branch: "", dirty: false,
  staged: 0, modified: 0, untracked: 0,
  ahead: 0, behind: 0,
  sha: "", isFork: false,
}

/**
 * Extracts the owner segment from a git remote URL. Handles both ssh
 * (`git@host:owner/repo.git`) and https (`https://host/owner/repo.git`)
 * shapes; returns empty string when no owner can be parsed.
 */
function extractRemoteOwner(url: string): string {
  const match = url.match(/[:/]([^/:\s]+)\/[^/\s]+?(?:\.git)?\s*$/)
  return match ? match[1]! : ""
}

/**
 * Parses `git remote -v` output for the owners of `origin` and `upstream`.
 * Lines look like:
 *   origin\tgit@github.com:owner/repo.git (fetch)
 *   upstream\thttps://github.com/owner/repo.git (push)
 */
function parseRemoteOwners(remoteOutput: string): { origin: string; upstream: string } {
  let origin = ""
  let upstream = ""
  for (const line of remoteOutput.split("\n")) {
    if (!line) continue
    // Match either tab-separated or whitespace-separated remote/url pairs.
    const match = line.match(/^(\S+)\s+(\S+)/)
    if (!match) continue
    const [, name, url] = match
    if (name === "origin" && !origin) origin = extractRemoteOwner(url!)
    else if (name === "upstream" && !upstream) upstream = extractRemoteOwner(url!)
  }
  return { origin, upstream }
}

/**
 * Collects git repository status for the given working directory.
 * Uses 2 git spawns: rev-parse (repo name) and status -b --porcelain (branch + status + ahead/behind).
 * @param cwd - Working directory path.
 * @returns Git info object, or empty defaults if not a git repo.
 */
export function getGitInfo(cwd: string): GitInfo {
  const run = (...args: string[]) =>
    (spawnSync("git", ["--no-optional-locks", "-C", cwd, ...args], {
      // suppress git warnings so they don't pollute the statusline
      stdio: ["ignore", "pipe", "ignore"],
      encoding: "utf8",
    }).stdout ?? "").trim()

  try {
    // Fold short SHA into the existing rev-parse call — both lines come back
    // from one spawn, saving a round trip per refresh.
    const revParseOut = run("rev-parse", "--show-toplevel", "--short", "HEAD")
    const [toplevel, sha] = revParseOut.split("\n")
    const repo = toplevel?.split("/").pop() ?? ""
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

    // Fork detection: only meaningful when both `origin` and `upstream`
    // exist and resolve to different owners.
    const remoteOwners = parseRemoteOwners(run("remote", "-v"))
    const isFork = !!remoteOwners.origin
                && !!remoteOwners.upstream
                && remoteOwners.origin !== remoteOwners.upstream

    return {
      repo, branch,
      dirty: staged + modified + untracked > 0,
      staged, modified, untracked,
      ahead, behind,
      sha: sha ?? "",
      isFork,
    }
  } catch {
    return EMPTY
  }
}
