// Parent-process inspection — detect security-relevant flags Claude Code
// was launched with (--dangerously-skip-permissions today). Read once per
// statusline invocation; each invocation is a fresh process, so no
// in-memory cache is needed across refreshes.

import { readFileSync } from "node:fs"

const SKIP_PERMISSIONS_FLAG = "--dangerously-skip-permissions"
const SPAWN_TIMEOUT_MS = 500

/**
 * Returns the parent process command line as a single space-joined string,
 * or empty string when it can't be read. Platform-specific implementation
 * shells out to `ps` on macOS and reads `/proc/<ppid>/cmdline` on Linux.
 */
function readParentCmdline(pid: number): string {
  try {
    if (process.platform === "darwin") {
      const result = Bun.spawnSync({
        cmd: ["ps", "-p", String(pid), "-o", "command="],
        stdout: "pipe",
        stderr: "ignore",
        timeout: SPAWN_TIMEOUT_MS,
      })
      if (result.exitCode !== 0) return ""
      return new TextDecoder().decode(result.stdout).trim()
    }
    if (process.platform === "linux") {
      const raw = readFileSync(`/proc/${pid}/cmdline`, "utf-8")
      // /proc/<pid>/cmdline separates argv with NULs; join with spaces so
      // substring scans behave the same on both platforms.
      return raw.split("\0").filter(Boolean).join(" ")
    }
    return ""
  } catch {
    return ""
  }
}

/**
 * Tests whether the parent process (typically Claude Code itself) was
 * launched with `--dangerously-skip-permissions`. Returns false on
 * unsupported platforms, missing ppid, or any error.
 *
 * False negatives (rendering nothing) are preferable to false positives
 * for a security indicator — when in doubt, don't reassure the user.
 */
export function detectSkipPermissions(): boolean {
  const ppid = process.ppid
  if (!ppid) return false
  const cmdline = readParentCmdline(ppid)
  return cmdline.includes(SKIP_PERMISSIONS_FLAG)
}
