// Claude Code statusline — Bun + TypeScript
// Usage: configured in ~/.claude/settings.json as statusLine command
// Test:  echo '{"model":{"display_name":"Opus"}}' | bun src/index.ts

import { parseStdin } from "./stdin"
import { getGitInfo } from "./git"
import { renderLine } from "./render"
import { box } from "./box"
import { c } from "./format"

const data = await parseStdin()
const git = data.cwd ? getGitInfo(data.cwd) : null
const line = renderLine(data, git)

for (const l of box([line], c("cyan", data.model))) {
  console.log(l)
}
