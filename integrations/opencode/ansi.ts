// Translate the shared renderer's SGR subset into native text spans. This module
// is pure and does not load OpenTUI's native library, so conversion is testable.
export interface Span {
  text: string
  color?: string
  bold: boolean
  dim: boolean
}
const COLORS = ["#000000", "#cd3131", "#0dbc79", "#e5e510", "#2472c8", "#bc3fbc", "#11a8cd", "#e5e5e5"]
const BRIGHT = ["#666666", "#f14c4c", "#23d18b", "#f5f543", "#3b8eea", "#d670d6", "#29b8db", "#ffffff"]
const hex = (r: number, g: number, b: number) => "#" + [r, g, b].map(v => v.toString(16).padStart(2, "0")).join("")
function indexed(index: number): string {
  if (index < 8) return COLORS[index]
  if (index < 16) return BRIGHT[index - 8]
  if (index >= 232) { const value = 8 + (index - 232) * 10; return hex(value, value, value) }
  const n = index - 16
  const cube = [0, 95, 135, 175, 215, 255]
  return hex(cube[Math.floor(n / 36)], cube[Math.floor(n / 6) % 6], cube[n % 6])
}

export function ansiSpans(value: string): Span[] {
  const spans: Span[] = []
  let style: Omit<Span, "text"> = { bold: false, dim: false }
  let last = 0
  const append = (text: string) => {
    if (text) spans.push({ ...style, text: text.replaceAll("\u00a0", " ") })
  }
  for (const match of value.matchAll(/\x1b\[([0-9;]*)m/g)) {
    append(value.slice(last, match.index))
    const codes = match[1].split(";").map(Number)
    for (let i = 0; i < codes.length; i++) {
      const code = codes[i]
      if (code === 0) style = { bold: false, dim: false }
      else if (code === 1) style.bold = true
      else if (code === 2) style.dim = true
      else if (code === 22) { style.bold = false; style.dim = false }
      else if (code === 39) delete style.color
      else if (code >= 30 && code <= 37) style.color = COLORS[code - 30]
      else if (code >= 90 && code <= 97) style.color = BRIGHT[code - 90]
      else if (code === 38 && codes[i + 1] === 2 && codes.length > i + 4) {
        style.color = hex(codes[i + 2], codes[i + 3], codes[i + 4]); i += 4
      } else if (code === 38 && codes[i + 1] === 5 && codes.length > i + 2) {
        style.color = indexed(codes[i + 2]); i += 2
      }
    }
    last = match.index + match[0].length
  }
  append(value.slice(last))
  return spans
}
