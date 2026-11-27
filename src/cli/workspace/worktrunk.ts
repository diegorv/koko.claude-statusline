// Worktrunk (https://worktrunk.dev) data for the current worktree

import { spawnSync } from "node:child_process"
import type { WorktrunkInfo } from "../../core/workspace.ts"
import { parseWorktrunkList } from "../../workspace/worktrunk.ts"

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
