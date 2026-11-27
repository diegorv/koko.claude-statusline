import type { WorktrunkInfo } from "../core/workspace.ts"

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
