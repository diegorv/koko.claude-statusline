# Installation

Claude Code and Antigravity CLI can run the TypeScript command from a checkout or a self-contained [release bundle](#install-from-a-prebuilt-bundle-no-clone). The numbered steps configure Claude Code. [Antigravity CLI](#antigravity-cli) uses its own command settings. [OpenCode](#opencode) loads the plugin directory from a full checkout. For Codex CLI 0.171.0 or 0.172.0, register the native provider from a checkout on the connected app-server host. See the [Codex setup guide](CODEX.md).

## Command prerequisites

- A TypeScript runtime — **[Bun](https://bun.sh) `>= 1.0`** (recommended), **[Node](https://nodejs.org) `>= 22.18`/`>= 23.6`**, or **[tsx](https://tsx.is)**. The script runs directly from TypeScript with no build step; pick whichever you already have. See [Other runtimes](#other-runtimes) for the tradeoffs.
- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) or [Antigravity CLI](https://antigravity.google/docs/cli/statusline/) installed and configured.
- A terminal with true-color (24-bit) support (iTerm2, Ghostty, Kitty, Alacritty, WezTerm, modern Terminal.app, modern GNOME Terminal).
- Tested on macOS. CI passes on Linux but has not been manually validated there.

Confirm Bun is on your `PATH`:

```sh
bun --version
```

If the command is not found, install Bun first: `curl -fsSL https://bun.sh/install | bash`.

## 1. Clone the repository

Pick any stable location — the path will be hard-coded into your Claude Code settings, so do not move the directory after installing.

```sh
git clone https://github.com/diegorv/koko.claude-statusline.git
cd koko.claude-statusline
```

The standalone command runs directly from the checkout. Contributors install the development dependencies to run tests and typechecks. See [Development](DEVELOPMENT.md#testing).

## 2. Get the absolute path

You need an absolute path for the next step. From inside the cloned directory:

```sh
pwd
```

Common results:

| OS | Example |
|---|---|
| macOS | `/Users/<you>/code/koko.claude-statusline` |
| Linux | `/home/<you>/code/koko.claude-statusline` |

Copy that path — you will paste it into `settings.json`.

## 3. Configure Claude Code

Open `~/.claude/settings.json` (create it if it does not exist) and add a `statusLine` block:

```json
{
  "statusLine": {
    "type": "command",
    "command": "bun /absolute/path/to/koko.claude-statusline/src/index.ts",
    "padding": 0,
    "refreshInterval": 10
  }
}
```

Replace `/absolute/path/to/...` with the value from step 2.

Key settings:

- **`padding: 0`** (recommended) — removes the default whitespace Claude Code wraps around the statusline so the layout can use the full terminal width. The script already reserves space for Claude Code's overlay indicators via `CLAUDE_STATUSLINE_RIGHT_MARGIN` (see [Tuning](TUNING.md)).
- **`refreshInterval`** — how often (in seconds, minimum `1`) Claude Code re-runs the command. Useful for time-based fields (cost, duration, rate-limit countdowns) that change without an explicit Claude Code event. Omit to refresh only on events.

## 4. Verify the install

Smoke-test the script directly, outside Claude Code:

```sh
echo '{"model":{"display_name":"Opus"},"context_window":{"used_percentage":45},"cost":{"total_cost_usd":0.05,"total_duration_ms":120000}}' | bun src/index.ts
```

You should see a single header row with the model name, a context-window gradient bar, the cost, and the duration. If you see ANSI escape codes printed literally, your terminal does not support true-color — try a different terminal emulator.

Then restart Claude Code (or open a new session). The statusline should appear at the bottom of the Claude Code UI.

## 5. Updating

From inside the cloned directory:

```sh
git pull
```

No restart of Claude Code is required — the script is re-read on the next refresh.

## Antigravity CLI

After cloning, add this block to `~/.gemini/antigravity-cli/settings.json`, preserving your other settings:

```json
{
  "statusLine": {
    "type": "command",
    "command": "bun /absolute/path/to/koko.claude-statusline/src/index.ts --agent antigravity",
    "padding": 0
  }
}
```

Use your checkout's absolute path. For paths containing spaces, quote the script path inside the command using escaped double quotes (`\"/path with spaces/src/index.ts\"`). Node and tsx work with the same arguments. A bundle built from this version also accepts `--agent antigravity`; older releases may only support Claude.

Smoke-test without launching the CLI:

```sh
echo '{"product":"antigravity","model":{"display_name":"Gemini","effort":"high"},"context_window":{"used_percentage":25},"quota":{"gemini-weekly":{"remaining_fraction":0.75}},"agent_state":"working","terminal_width":120}' | bun src/index.ts --agent antigravity
```

The script auto-detects `product: "antigravity"` when no argument is supplied. `--agent antigravity` explicitly selects that adapter even before product metadata is available. Unmarked payloads default to Claude; unsupported product names or agent arguments fail with a message on stderr.

The Antigravity adapter shows model, effort, context percentage, session title, Git/worktree state, Vim mode, quotas, aggregate input/output tokens, agent state and subagents when available. Costs marked as estimated (or without an explicit estimate flag) use `~`; missing costs are hidden. Bucket balances without a percentage show `N left`. Disabled buckets are marked `disabled`.

It does not read Claude configuration, infer permission bypass from Antigravity's sandbox settings, or parse Antigravity transcripts as Claude JSONL. Tool history, todos, output speed, session diff and elapsed times remain absent where the documented payload provides no data. Antigravity's `terminal_width` takes precedence over terminal probing. The exact occupied context-token count is omitted because `current_usage` is not documented to match `used_percentage`; aggregate input/output totals are shown separately. Antigravity uses no right margin by default, and its frame spans all available columns even when the body is short. Header annotations do not reduce the width of its body rows. Claude keeps its 16-column reserve for overlays. Set `KOKO_STATUSLINE_RIGHT_MARGIN` to override either default.

This integration targets **Antigravity CLI**, not the IDE or desktop app. The payload mapping is based on the [official statusline documentation](https://antigravity.google/docs/cli/statusline/); it is covered by automated payload and subprocess tests, not a live Antigravity session test.

## OpenCode

The local TUI plugin targets **OpenCode 2.4.x**. Its mapping tests use SDK **2.4.2**. Keep the full checkout at a stable path. OpenCode loads the package's public `./tui` export from `integrations/opencode/tui.tsx` and the plugin imports shared modules under `src/`.

Add the integration's absolute directory to the existing `plugins` array in **`~/.config/opencode/cli.json`**, preserving its other entries and settings:

```json
{
  "$schema": "https://opencode.ai/v2/cli.json",
  "plugins": ["/absolute/path/to/koko.claude-statusline/integrations/opencode"]
}
```

With `XDG_CONFIG_HOME`, the file is `$XDG_CONFIG_HOME/opencode/cli.json`. OpenCode has no project-local CLI settings file. For a temporary preview that does not change your settings:

```sh
OPENCODE_CLI_CONFIG_CONTENT='{"plugins":["/absolute/path/to/koko.claude-statusline/integrations/opencode"]}' opencode
```

Inline arrays replace the global arrays for that launch. These are host CLI settings, not `opencode.json` server plugin settings. OpenCode resolves the host SDK at runtime. Development SDK installation is only needed to typecheck/run the plugin's own tests; see [development](DEVELOPMENT.md#opencode-plugin-development).

The panel appears above the composer in a session and above the footer on the home screen. It shows the selected model/recognized effort, current context when known, session cost and input/output/cache totals, tools, direct subagents, MCP status, branch and dirty state. It uses the slot's measured width, so an open sidebar does not cause it to assume the full terminal width. Git refreshes every five seconds; session data follows the host's reactive cache.

Repository names come from server project-root metadata, including when the session starts in a subdirectory. The public server VCS API does not expose the same staged/untracked/ahead/behind/SHA details as the local Git collector. Those fields remain absent. Failed tools use a red cross; failed/interrupted children keep their native outcomes, and an idle child with no reported outcome is not marked successful. Generated output totals include both visible output and reasoning, which OpenCode 2 reports separately. Provider rate limits, todo progress, output speed and elapsed times are also omitted where no reliable host data is connected. Switching models or compacting/undoing clears unknown context usage instead of displaying a stale percentage.

The existing `PANE_HEADER_DIR` export works for the active OpenCode panel. Remove the package path from `plugins` to uninstall; core and other agent settings are unaffected. Source: [TUI plugin interface](https://opencode.ai/docs/build/plugins/cli/) and [CLI configuration](https://opencode.ai/docs/cli/config/).

## Install from a prebuilt bundle (no clone)

The [release bundle](https://github.com/diegorv/koko.claude-statusline/releases) contains the standalone command as a single JavaScript ES module. Run it with Bun or Node. The verified runtime matrix includes Bun 1.4.5 and Node 22, 24 and 26. The bundle can run outside the checkout without package installation or TypeScript stripping.

To reproduce the release artifact in a checkout:

```sh
mkdir -p dist
bun build src/index.ts --target=node --outfile=dist/statusline.mjs
echo '{"model":{"display_name":"Opus"}}' | node dist/statusline.mjs
```

Download the latest bundle to a stable location (do not move it afterward — the path goes into your settings):

```sh
curl -fL -o ~/.claude-statusline.mjs \
  https://github.com/diegorv/koko.claude-statusline/releases/latest/download/statusline.mjs
```

Optionally verify its integrity against the checksum published on the release:

```sh
shasum -a 256 ~/.claude-statusline.mjs
# compare the hash against the statusline.mjs line in that release's
# checksums-sha256.txt (attached to the release on GitHub)
```

Add a `statusLine` block to `~/.claude/settings.json`, pointing `command` at the file with `node` (or `bun`). Use an **absolute** path — Claude Code does not expand `~`:

```json
{
  "statusLine": {
    "type": "command",
    "command": "node /Users/<you>/.claude-statusline.mjs",
    "padding": 0,
    "refreshInterval": 10
  }
}
```

`padding` and `refreshInterval` behave exactly as in [Configure Claude Code](#3-configure-claude-code) above. To update, re-run the `curl` command — it overwrites the file in place, and Claude Code re-reads it on the next refresh.

## Other runtimes

The entry point is plain TypeScript with no build step and makes zero `Bun.*` API calls — every system call goes through Node-compatible `node:` modules, and every internal import carries an explicit `.ts` extension. So you choose the runtime: replace `bun` in the `command` (and in the smoke test) with any of these.

### Node

Node runs the entry point directly using its built-in TypeScript **type stripping** — no build step, no flags:

```json
{
  "statusLine": {
    "type": "command",
    "command": "node /absolute/path/to/koko.claude-statusline/src/index.ts",
    "padding": 0,
    "refreshInterval": 10
  }
}
```

Requires **Node `>= 23.6`**, or **`>= 22.18`** on the 22 LTS line, where type stripping is on by default. On Node 22.6–22.17 it works with the `--experimental-strip-types` flag. Type stripping only *removes* type annotations — it does not transpile — which is fine here: the source uses no enums, namespaces, decorators, or constructor parameter properties. And because there are zero runtime dependencies, Node users can skip `bun install` entirely — clone and run.

### tsx

[tsx](https://tsx.is) (and other bundler-style TS runners) also work. Install it (`bun add -g tsx`, `npm i -g tsx`, etc.) and use `tsx` wherever this guide uses `bun`:

```json
{
  "statusLine": {
    "type": "command",
    "command": "tsx /absolute/path/to/koko.claude-statusline/src/index.ts",
    "padding": 0,
    "refreshInterval": 10
  }
}
```

CI covers tsx by proxy rather than with a dedicated job: tsx runs on esbuild — bundler-style resolution like Bun, and it *transpiles* rather than only stripping types, so it is strictly more permissive than the Node path. The Bun and Node smoke tests bracket it (Bun exercises the bundler-style `.ts` resolution, Node the stricter type-strip-only path), so a separate tsx job adds no new signal — only an npm dependency tree pulled into CI outside the `bunfig.toml` cooldown.

Verify any of them the same way, e.g. `echo '{"model":{"display_name":"Opus"}}' | node src/index.ts`.

### Supply-chain note

Running the statusline installs **no package** — there are zero runtime dependencies, so the code that executes is exactly what you cloned, nothing resolved from a registry at run time. The runtimes differ in what *they* pull in:

- **Bun / Node** add nothing beyond the runtime itself. Node users can even skip `bun install` — clone and run.
- **tsx** is the exception: it is an npm package (tsx + esbuild + its tree), so `npm i -g tsx` installs a dependency tree globally, resolved by npm **outside** the cooldown in `bunfig.toml`.

Bun stays the recommended path: no extra global install, and its `bun install` (dev types only) honors that cooldown (see [Development](DEVELOPMENT.md)). But every option runs the same source — you are never locked in.

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| Statusline does not appear in Claude Code | The `command` path is wrong or Bun is not on `PATH`. Run the command from `settings.json` manually in your shell and check for errors. Use an absolute path to `bun` (`which bun`) if `PATH` differs between your shell and Claude Code's spawned process. |
| Output is truncated or overlaps Claude Code's `@model /effort` overlay | Raise `CLAUDE_STATUSLINE_RIGHT_MARGIN` (see [Tuning](TUNING.md)). Default `16` columns is reserved for Claude Code's overlay indicators. |
| Extra whitespace around the statusline | Set `"padding": 0` in the `statusLine` block. |
| Colors render as `[38;2;...m` literals | Your terminal does not advertise true-color. Use iTerm2, Ghostty, Kitty, Alacritty, or WezTerm. |
| Layout looks fine when run manually but breaks inside Claude Code | Claude Code reports a different terminal width. Set `CLAUDE_STATUSLINE_DEBUG_LOG=/tmp/statusline.log` and inspect the `termW` / `maxW` / `overflow` fields per invocation. |
| `bun: command not found` when Claude Code runs the script | Claude Code spawns a non-login shell that may not source your shell rc. Replace `bun` in the `command` with the absolute path returned by `which bun` (typically `~/.bun/bin/bun`). |
| Need to capture what is being rendered for a bug report | Set `CLAUDE_STATUSLINE_DEBUG_LOG` to a writable file path. Each invocation appends one JSON line. |
