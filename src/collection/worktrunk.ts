// Worktrunk (https://worktrunk.dev) data for the current worktree

import { spawnSync } from "node:child_process"

export interface WorktrunkInfo {
  /** Agent activity marker set by worktrunk's Claude plugin (e.g. 🤖, 💬). */
  marker: string
  /** Commits ahead of / behind the repo's default branch. */
  ahead: number
  behind: number
  defaultBranch: string
}

/** Extracts the current worktree's fields from `wt list --format=json` (schema 2). */
export function parseWorktrunkList(output: string): WorktrunkInfo | null {
  try {
    const parsed = JSON.parse(output)
    const item = parsed?.items?.find((i: any) => i?.worktree?.current)
    if (!item) return null
    return {
      marker: typeof item.marker === "string" ? item.marker : "",
      ahead: Number(item.default_branch?.ahead) || 0,
      behind: Number(item.default_branch?.behind) || 0,
      defaultBranch: typeof parsed.repo?.default_branch === "string" ? parsed.repo.default_branch : "",
    }
  } catch {
    return null
  }
}

/**
 * Runs `wt list --format=json` in cwd. Returns null when wt isn't installed
 * or fails, so the statusline renders without it.
 */
export function getWorktrunkInfo(cwd: string): WorktrunkInfo | null {
  const result = spawnSync("wt", ["-C", cwd, "list", "--format=json"], {
    stdio: ["ignore", "pipe", "ignore"],
    encoding: "utf8",
    timeout: 1000,
  })
  return result.status === 0 ? parseWorktrunkList(result.stdout ?? "") : null
}
