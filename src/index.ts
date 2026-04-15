// Claude Code statusline — Bun + TypeScript
// Usage: configured in ~/.claude/settings.json as statusLine command
// Test:  echo '{"model":{"display_name":"Opus"}}' | bun src/index.ts

import { parseStdin } from "./stdin"
import { getGitInfo } from "./git"
import { getConfigCounts } from "./config"
import { renderLines } from "./render"
import { box } from "./box"
import { c, nbsp } from "./format"

const data = await parseStdin()
const git = data.cwd ? getGitInfo(data.cwd) : null
const config = data.cwd ? getConfigCounts(data.cwd) : null
const lines = renderLines(data, git, config)

for (const l of box(lines.map(nbsp), c("cyan", data.model))) {
  console.log(l)
}
