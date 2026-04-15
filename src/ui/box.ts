// Minimal box drawing — replaces boxen dependency.
// Inspired by boxen (https://github.com/sindresorhus/boxen) but only implements
// the subset we use: round borders, dim style, fixed width, and padding.

import { vlen } from "./format"

const DIM = "\x1b[2m"
const RESET = "\x1b[0m"

// Unicode box-drawing characters for "round" style (same as cli-boxes "round")
const BORDER = {
  topLeft: "╭", topRight: "╮",
  bottomLeft: "╰", bottomRight: "╯",
  horizontal: "─", vertical: "│",
} as const

export interface BoxOptions {
  width: number
  padding?: { top?: number; bottom?: number; left?: number; right?: number }
}

/**
 * Wraps content lines in a rounded box with dim borders and fixed width.
 * Pads content to fill the box and adds vertical padding lines as needed.
 * @param content - The text content (may contain newlines).
 * @param options - Box width and optional padding configuration.
 * @returns The box as a multi-line string ready for output.
 */
export function box(content: string, options: BoxOptions): string {
  const { width } = options
  const padTop = options.padding?.top ?? 0
  const padBottom = options.padding?.bottom ?? 0
  const padLeft = options.padding?.left ?? 0
  // Inner width = total width minus 2 border chars
  const innerWidth = width - 2

  const lines = content ? content.split("\n") : []

  // Pad each content line to fill inner width
  const paddedLines: string[] = []

  // Top padding
  for (let i = 0; i < padTop; i++) {
    paddedLines.push(" ".repeat(innerWidth))
  }

  // Content lines with left/right padding
  for (const line of lines) {
    const leftPad = " ".repeat(padLeft)
    const rightPad = " ".repeat(Math.max(0, innerWidth - padLeft - vlen(line)))
    paddedLines.push(leftPad + line + rightPad)
  }

  // Bottom padding
  for (let i = 0; i < padBottom; i++) {
    paddedLines.push(" ".repeat(innerWidth))
  }

  // If no lines at all, add one empty line
  if (paddedLines.length === 0) {
    paddedLines.push(" ".repeat(innerWidth))
  }

  // Build box
  const h = BORDER.horizontal
  const top = `${DIM}${BORDER.topLeft}${h.repeat(innerWidth)}${BORDER.topRight}${RESET}`
  const bottom = `${DIM}${BORDER.bottomLeft}${h.repeat(innerWidth)}${BORDER.bottomRight}${RESET}`
  const middle = paddedLines.map(line =>
    `${DIM}${BORDER.vertical}${RESET}${line}${DIM}${BORDER.vertical}${RESET}`
  )

  return [top, ...middle, bottom].join("\n")
}
