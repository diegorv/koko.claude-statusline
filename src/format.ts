// ANSI formatting helpers

const RESET = "\x1b[0m"
const BOLD = "\x1b[1m"
const DIM = "\x1b[2m"

const ANSI: Record<string, string> = {
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
}

export const c = (color: string, text: string) => `${ANSI[color] ?? ""}${text}${RESET}`
export const bold = (color: string, text: string) => `${BOLD}${ANSI[color] ?? ""}${text}${RESET}`
export const dim = (text: string) => `${DIM}${text}${RESET}`

export function gradientBar(percent: number, width = 20): string {
  const filled = Math.round((percent * width) / 100)
  let out = ""
  for (let i = 0; i < width; i++) {
    const t = width > 1 ? i / (width - 1) : 0
    let r: number, g: number, b: number
    if (t <= 0.5) {
      r = Math.round(220 * t * 2)
      g = 200
      b = Math.round(80 * (1 - t * 2))
    } else {
      const a = (t - 0.5) * 2
      r = 220
      g = Math.round(200 - 160 * a)
      b = Math.round(20 * a)
    }
    out += i < filled
      ? `\x1b[38;2;${r};${g};${b}m\u2588`
      : "\x1b[38;2;60;60;60m\u2591"
  }
  return out + RESET
}

export function pctColor(pct: number): string {
  if (pct >= 90) return ANSI.red
  if (pct >= 70) return ANSI.yellow
  return ANSI.green
}

export function formatDuration(ms: number): string {
  const sec = Math.floor(ms / 1000)
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`
  if (m > 0) return `${m}m`
  return `${sec}s`
}

export function formatResetIn(epochSec: number): string {
  const diff = epochSec * 1000 - Date.now()
  if (diff <= 0) return ""
  const mins = Math.ceil(diff / 60000)
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

export const nbsp = (s: string) => s.replace(/ /g, "\u00A0")
