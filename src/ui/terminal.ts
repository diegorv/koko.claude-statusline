// Terminal width detection — works even when stdout is piped (statusline mode).

import { closeSync, openSync, readFileSync, writeFileSync } from "node:fs"
import { spawnSync } from "node:child_process"

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
    const result = spawnSync("stty", ["size"], {
      stdio: [fd, "pipe", "ignore"],
    })
    if (result.status !== 0) return null
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

function rawTerminalWidth(): number | null {
  return fromStream(process.stdout)
    ?? fromStream(process.stderr)
    ?? fromEnv()
    ?? fromDevTty()
}

interface WidthCache {
  /** Trusted width currently in use. */
  width: number
  /** Wall-clock time (ms) when this trusted width was last observed. */
  lastSeen: number
  /** A suspicious low reading awaiting confirmation before we accept it. */
  pending?: { width: number; firstSeen: number }
}

// /dev/tty occasionally returns a wildly wrong narrow value (observed: 45 cols
// on a 191-col iTerm2 window) while Claude Code is busy. The constants below
// implement a hysteresis: we only treat a fresh reading as suspicious when it
// is BOTH absolutely narrow AND much smaller than the cached trusted value,
// and we require the suspicious value to persist for PENDING_CONFIRM_MS
// before we accept it (so a real terminal resize is honored, just delayed).
const CACHE_TTL_MS = 30_000
const PENDING_CONFIRM_MS = 3_000
const SUSPICIOUS_ABSOLUTE_THRESHOLD = 60
const SUSPICIOUS_RATIO_THRESHOLD = 0.5
const PENDING_MATCH_TOLERANCE = 5

function cachePath(key: string): string {
  const safe = key.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 64)
  return `/tmp/claude-statusline-width-${safe}.json`
}

function readCache(key: string): WidthCache | null {
  try {
    const obj = JSON.parse(readFileSync(cachePath(key), "utf8"))
    return typeof obj?.width === "number" && typeof obj?.lastSeen === "number" ? obj : null
  } catch {
    return null
  }
}

function writeCache(key: string, entry: WidthCache): void {
  try {
    writeFileSync(cachePath(key), JSON.stringify(entry))
  } catch {}
}

/**
 * Validates a fresh reading against a recently observed trusted value.
 *
 * Returns the value the caller should treat as the terminal width. If the
 * fresh reading looks like a transient glitch (much narrower than cached and
 * below an absolute threshold), the cached trusted width is returned instead
 * and the suspicious value is recorded as `pending`. A genuine resize is
 * accepted once a matching pending value has been observed for at least
 * PENDING_CONFIRM_MS.
 */
function stabilize(fresh: number | null, key: string): number | null {
  const cached = readCache(key)
  const now = Date.now()
  const cacheIsFresh = cached !== null && (now - cached.lastSeen) < CACHE_TTL_MS

  if (fresh === null) return cacheIsFresh ? cached!.width : null

  const suspicious =
    cacheIsFresh &&
    fresh < SUSPICIOUS_ABSOLUTE_THRESHOLD &&
    fresh < cached!.width * SUSPICIOUS_RATIO_THRESHOLD

  if (!suspicious) {
    writeCache(key, { width: fresh, lastSeen: now })
    return fresh
  }

  const pending = cached!.pending
  if (pending && Math.abs(pending.width - fresh) <= PENDING_MATCH_TOLERANCE) {
    if (now - pending.firstSeen >= PENDING_CONFIRM_MS) {
      // Sustained — accept it as a real resize.
      writeCache(key, { width: fresh, lastSeen: now })
      return fresh
    }
    // Still inside the confirmation window; keep using the trusted width.
    writeCache(key, { width: cached!.width, lastSeen: cached!.lastSeen, pending })
    return cached!.width
  }

  // First (or different) suspicious reading — start a fresh confirmation window.
  writeCache(key, {
    width: cached!.width,
    lastSeen: cached!.lastSeen,
    pending: { width: fresh, firstSeen: now },
  })
  return cached!.width
}

export interface TerminalWidthOptions {
  /**
   * Stability key for caching across invocations (e.g., a session identifier).
   * When provided, fresh readings are validated against a cached trusted value
   * to suppress transient /dev/tty glitches. When omitted, raw readings are
   * returned with no validation.
   */
  stabilityKey?: string | null
}

/**
 * Returns the terminal width in columns, or null if it can't be determined.
 *
 * Fallback chain: stdout.columns → stderr.columns → COLUMNS env → stty via /dev/tty.
 * Claude Code's statusLine pipes stdout (and often stderr too), but the subprocess
 * inherits the controlling terminal, so /dev/tty is the reliable last resort.
 *
 * When `stabilityKey` is provided, the result is debounced against a cached
 * trusted value to suppress the occasional bad /dev/tty reading that would
 * otherwise produce a misformatted statusline.
 */
export function getTerminalWidth(opts: TerminalWidthOptions = {}): number | null {
  const fresh = rawTerminalWidth()
  return opts.stabilityKey ? stabilize(fresh, opts.stabilityKey) : fresh
}
