// Box drawing wrapper

const ANSI_RE = /\x1b\[[0-9;]*m/g
const DIM = "\x1b[2m"
const RESET = "\x1b[0m"

const strip = (s: string) => s.replace(ANSI_RE, "")
const vlen = (s: string) => [...strip(s)].length

function pad(s: string, width: number): string {
  const diff = width - vlen(s)
  return diff > 0 ? s + " ".repeat(diff) : s
}

function getWidth(): number {
  const w = process.stdout?.columns
    || process.stderr?.columns
    || Number(process.env.COLUMNS)
    || 80
  return Math.max(w, 40)
}

export function box(lines: string[], title?: string): string[] {
  const w = getWidth()
  const inner = w - 4 // "│ " + content + " │"

  // ╭─ Title ──────╮
  let top: string
  if (title) {
    const dashes = Math.max(1, w - 5 - vlen(title))
    top = `${DIM}╭─${RESET} ${title} ${DIM}${"─".repeat(dashes)}╮${RESET}`
  } else {
    top = `${DIM}╭${"─".repeat(w - 2)}╮${RESET}`
  }

  // │ content │
  const rows = lines.map(l => `${DIM}│${RESET} ${pad(l, inner)} ${DIM}│${RESET}`)

  // ╰──────────╯
  const bottom = `${DIM}╰${"─".repeat(w - 2)}╯${RESET}`

  return [top, ...rows, bottom]
}
