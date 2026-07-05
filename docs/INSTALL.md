# Installation

## Prerequisites

- A TypeScript runtime — **[Bun](https://bun.sh) `>= 1.0`** (recommended), **[Node](https://nodejs.org) `>= 22.18`/`>= 23.6`**, or **[tsx](https://tsx.is)**. The script runs directly from TypeScript with no build step; pick whichever you already have. See [Other runtimes](#other-runtimes) for the tradeoffs.
- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) installed and configured.
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
bun install
```

`bun install` only pulls dev dependencies (`@types/bun`, `typescript`). There are zero runtime dependencies.

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
bun install
```

No restart of Claude Code is required — the script is re-read on the next refresh.

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
