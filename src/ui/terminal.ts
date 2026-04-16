// Terminal width detection — works even when stdout is piped (statusline mode).

import { closeSync, openSync } from "node:fs"

function fromStream(stream: NodeJS.WriteStream | undefined): number | null {
  const cols = stream?.columns
  return typeof cols === "number" && Number.isFinite(cols) && cols > 0 ? Math.floor(cols) : null
}

function fromEnv(): number | null {
  const cols = Number.parseInt(process.env.COLUMNS ?? "", 10)
  return Number.isFinite(cols) && cols > 0 ? cols : null
}

/**
 * Last-resort fallback: query `stty size` with stdin redirected to /dev/tty.
 * Works when Claude Code pipes both stdout and stderr (so neither has .columns)
 * but the subprocess still inherits the controlling terminal.
 */
function fromDevTty(): number | null {
  let fd: number | undefined
  try {
    fd = openSync("/dev/tty", "r")
    const result = Bun.spawnSync({
      cmd: ["stty", "size"],
      stdin: fd,
      stdout: "pipe",
      stderr: "ignore",
    })
    if (result.exitCode !== 0) return null
    const parts = new TextDecoder().decode(result.stdout).trim().split(/\s+/)
    const cols = Number.parseInt(parts[1] ?? "", 10)
    return Number.isFinite(cols) && cols > 0 ? cols : null
  } catch {
    return null
  } finally {
    if (fd !== undefined) {
      try { closeSync(fd) } catch {}
    }
  }
}

/**
 * Returns the terminal width in columns, or null if it can't be determined.
 *
 * Fallback chain: stdout.columns → stderr.columns → COLUMNS env → stty via /dev/tty.
 * Claude Code's statusLine pipes stdout (and often stderr too), but the subprocess
 * inherits the controlling terminal, so /dev/tty is the reliable last resort.
 */
export function getTerminalWidth(): number | null {
  return fromStream(process.stdout)
    ?? fromStream(process.stderr)
    ?? fromEnv()
    ?? fromDevTty()
}
