import type { EffortLevel } from "../../core/model.ts"

export type TextStyle = "dim" | "cyan" | "green" | "yellow" | "magenta" | "red"

export interface StyledText {
  text: string
  style?: TextStyle
}

export interface ContentGroup {
  kind: "model" | "effort" | "state" | "session" | "cost"
  spans: readonly StyledText[]
}

// OSC (including hyperlinks) takes BEL or ST. Other terminal control strings take ST.
// An unfinished string consumes the remaining input, as it would in a terminal.
const operatingSystemCommand = /(?:\x1b\]|\x9d)[\s\S]*?(?:\x07|\x1b\\|\x9c|$)/g
const controlString = /(?:\x1b[PX^_]|[\x90\x98\x9e\x9f])[\s\S]*?(?:\x1b\\|\x9c|$)/g
const terminalControl = /(?:\x1b\[|\x9b)[0-?]*[ -/]*[@-~]|\x1b[ -/]*[0-~]|[\x00-\x1f\x7f-\x9f]/g

function displayText(text: string): string {
  return text.replace(operatingSystemCommand, "").replace(controlString, "").replace(terminalControl, "")
}

export function modelContent(model: string): ContentGroup {
  return { kind: "model", spans: [{ text: displayText(model), style: "cyan" }] }
}

const effortStyles: Record<EffortLevel, TextStyle> = {
  low: "dim", medium: "yellow", high: "green", xhigh: "magenta", max: "red",
}

export function effortContent(level: EffortLevel | null): ContentGroup | null {
  return level && { kind: "effort", spans: [
    { text: "effort: ", style: "dim" },
    { text: level, style: effortStyles[level] },
  ] }
}

export function stateContent(state: string | null): ContentGroup | null {
  return state ? { kind: "state", spans: [{ text: displayText(state) }] } : null
}

export function sessionContent(name: string | null): ContentGroup | null {
  return name ? { kind: "session", spans: [{ text: displayText(name) }] } : null
}

export function costContent(cost: number | null, estimated: boolean | null): ContentGroup | null {
  if (cost === null) return null
  const amount = cost < 0.10 ? `${Math.round(cost * 100)}¢` : `$${cost.toFixed(2)}`
  return { kind: "cost", spans: [{ text: (estimated ? "~" : "") + amount, style: "yellow" }] }
}
