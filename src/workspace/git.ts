import type { GitInfo } from "../core/workspace.ts"

export const EMPTY_GIT: GitInfo = {
  repo: "", branch: "", dirty: false,
  staged: 0, modified: 0, untracked: 0,
  ahead: 0, behind: 0,
  sha: "", isFork: false, worktree: "",
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

export const revParse = ["rev-parse", "--path-format=absolute", "--show-toplevel", "--git-dir", "--git-common-dir", "--short", "HEAD"]
export const status = ["status", "-b", "--porcelain"]
export const remotes = ["remote", "-v"]

/** Parse the stdout of the three local Git queries, shared by both process lifecycles. */
export function parseGit(revParseOut: string, output: string, remoteOutput: string): GitInfo {
  const [toplevel, gitDir, commonDir, sha] = revParseOut.split("\n")
  const repo = toplevel?.split("/").pop() ?? ""
  if (!repo) return EMPTY_GIT

  // Single command for branch, ahead/behind, and file status
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
  const remoteOwners = parseRemoteOwners(remoteOutput)
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
    worktree: gitDir && gitDir !== commonDir ? repo : "",
  }
}
