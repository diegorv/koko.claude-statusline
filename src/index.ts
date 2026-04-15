// Claude Code statusline — Bun + TypeScript
// Usage: configured in ~/.claude/settings.json as statusLine command
// Test:  echo '{"model":{"display_name":"Opus"}}' | bun src/index.ts

import { c, bold, dim, gradientBar, pctColor, formatDuration, formatResetIn } from "./format"
import { box } from "./box"

// Nerd Font icons
const I = {
  folder: "\uf07c",  //
  branch: "\ue0a0",  //
  clock:  "\uf017",  //
  gauge:  "\uf0e4",  //
} as const

const SEP = dim(" \u00b7 ")
const RESET = "\x1b[0m"

// --- Parse stdin ---
let data: any
try {
  data = await Bun.stdin.json()
} catch {
  process.exit(0)
}

const model   = data.model?.display_name ?? "Unknown"
const ctx     = data.context_window?.used_percentage ?? 0
const cost    = data.cost?.total_cost_usd ?? 0
const dur     = data.cost?.total_duration_ms ?? 0
const added   = data.cost?.total_lines_added ?? 0
const removed = data.cost?.total_lines_removed ?? 0
const cwd     = data.workspace?.current_dir ?? data.cwd ?? ""

// --- Git ---
let repo = "", branch = "", dirty = false
if (cwd) {
  const run = (...args: string[]) =>
    Bun.spawnSync(["git", "--no-optional-locks", "-C", cwd, ...args]).stdout.toString().trim()
  try {
    repo = run("rev-parse", "--show-toplevel").split("/").pop() ?? ""
    branch = run("symbolic-ref", "--short", "HEAD")
    dirty = run("status", "--porcelain").length > 0
  } catch {}
}

// --- Main line: project + bar + cost + velocity + duration ---
const main: string[] = []

if (repo) {
  let git = `${bold("yellow", `${I.folder} ${repo}`)} ${c("green", `${I.branch} ${branch}`)}`
  if (dirty) git += c("yellow", "*")
  main.push(git)
}

main.push(`${gradientBar(ctx)} ${pctColor(ctx)}${Math.round(ctx)}%${RESET}`)
main.push(c("yellow", `$${cost.toFixed(2)}`))

if (added > 0 || removed > 0) {
  main.push(`${c("green", `+${added}`)} ${c("red", `-${removed}`)}`)
}

if (dur > 0) {
  main.push(dim(`${I.clock} ${formatDuration(dur)}`))
}

// --- Rate limits line (optional) ---
const rl: string[] = []

const rl5h = data.rate_limits?.five_hour
if (rl5h?.used_percentage != null) {
  const pct = Math.round(rl5h.used_percentage)
  let str = `${I.gauge} 5h: ${pctColor(pct)}${pct}%${RESET}`
  const reset = rl5h.resets_at ? formatResetIn(rl5h.resets_at) : ""
  if (reset) str += dim(` (${reset})`)
  rl.push(str)
}

const rl7d = data.rate_limits?.seven_day
if (rl7d?.used_percentage != null) {
  const pct = Math.round(rl7d.used_percentage)
  let str = `7d: ${pctColor(pct)}${pct}%${RESET}`
  const reset = rl7d.resets_at ? formatResetIn(rl7d.resets_at) : ""
  if (reset) str += dim(` (${reset})`)
  rl.push(str)
}

// --- Output ---
const content = [main.join(SEP)]
if (rl.length > 0) content.push(rl.join(SEP))

for (const line of box(content, c("cyan", model))) {
  console.log(line)
}
