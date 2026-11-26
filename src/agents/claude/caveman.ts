// Optional integration with the caveman skill (https://github.com/JuliusBrussee/caveman).
// Reads its flag and savings files from $CLAUDE_CONFIG_DIR. Returns null on any
// anomaly — caveman not installed, flag absent, malformed contents, symlinked
// paths, oversized payloads. Statusline must keep rendering when this returns null.

import { lstatSync, openSync, readSync, closeSync, constants } from "node:fs"
import { join } from "node:path"
import { homedir } from "node:os"

const VALID_MODES = new Set([
  "off", "lite", "full", "ultra",
  "wenyan-lite", "wenyan", "wenyan-full", "wenyan-ultra",
  "commit", "review", "compress",
])

const MAX_FLAG_BYTES = 64
const MAX_SUFFIX_BYTES = 64

export interface CavemanState {
  /** Active mode, e.g. "lite", "full". Never "off" — we treat off as not-active. */
  mode: string
  /** Pre-rendered savings suffix from caveman-stats (e.g. "⛏ 12.4k"). Empty if absent. */
  savings: string
}

function configDir(): string {
  return process.env.CLAUDE_CONFIG_DIR ?? join(homedir(), ".claude")
}

/**
 * Safe read that mirrors caveman's own hardening: refuse symlinks, cap the
 * read at MAX bytes, return raw bytes for caller to validate. Never throws.
 */
function readCapped(path: string, max: number): string | null {
  try {
    const st = lstatSync(path)
    if (st.isSymbolicLink() || !st.isFile()) return null
    if (st.size > max) return null
    const O_NOFOLLOW = typeof constants.O_NOFOLLOW === "number" ? constants.O_NOFOLLOW : 0
    const fd = openSync(path, constants.O_RDONLY | O_NOFOLLOW)
    try {
      const buf = Buffer.alloc(max)
      const n = readSync(fd, buf, 0, max, 0)
      return buf.slice(0, n).toString("utf8")
    } finally {
      closeSync(fd)
    }
  } catch {
    return null
  }
}

function readMode(): string | null {
  const raw = readCapped(join(configDir(), ".caveman-active"), MAX_FLAG_BYTES)
  if (raw === null) return null
  const mode = raw.trim().toLowerCase()
  if (!VALID_MODES.has(mode)) return null
  if (mode === "off") return null
  return mode
}

function readSavings(): string {
  const raw = readCapped(join(configDir(), ".caveman-statusline-suffix"), MAX_SUFFIX_BYTES)
  if (raw === null) return ""
  // Strip control bytes — same defense as caveman-statusline.sh. A planted
  // file with ANSI escape codes would otherwise inject styling into our row.
  return raw.replace(/[\x00-\x1f\x7f]/g, "").trim()
}

/**
 * Returns the active caveman state, or null when caveman is inactive / not
 * installed. Caller renders nothing on null.
 *
 * Honors CAVEMAN_STATUSLINE_SAVINGS=0 to suppress the savings suffix (matches
 * the bash statusline's opt-out).
 */
export function getCavemanState(): CavemanState | null {
  const mode = readMode()
  if (!mode) return null
  const savings = process.env.CAVEMAN_STATUSLINE_SAVINGS === "0" ? "" : readSavings()
  return { mode, savings }
}
