// Claude Code statusline — Bun + TypeScript
// Usage: configured in ~/.claude/settings.json as statusLine command
// Test:  echo '{"model":{"display_name":"Opus"}}' | bun src/index.ts

import { parseStdin } from "./parsing/stdin"
import { getGitInfo } from "./collection/git"
import { getConfigCounts } from "./collection/config"
import { parseTranscript } from "./parsing/transcript"
import { render } from "./ui/render"
import { renderBoxes } from "./ui/boxes"

const data = await parseStdin()
const git = data.cwd ? getGitInfo(data.cwd) : null
const config = data.cwd ? getConfigCounts(data.cwd) : null
const transcript = data.transcriptPath ? parseTranscript(data.transcriptPath) : null
const result = render(data, git, config, transcript)
console.log(renderBoxes(data, result, git?.repo))
