# Installation

## Prerequisites

- [Bun](https://bun.sh) `>= 1.0` (recommended) — runs the script directly from TypeScript, no build step. Any bundler-style TS runner also works (e.g. [tsx](https://tsx.is)); plain `node src/index.ts` does **not**, because Node's ESM loader needs explicit `.ts` import extensions. See [Other runtimes](#other-runtimes) below.
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

Bun is the recommended runtime, but the entry point is plain TypeScript with no build step and makes zero `Bun.*` API calls — every system call goes through Node-compatible `node:` modules. So any **bundler-style** TypeScript runner can run it:

- **[tsx](https://tsx.is)** — install it (`bun add -g tsx`, `npm i -g tsx`, etc.) and use `tsx` wherever this guide uses `bun`:

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

  Verify the same way: `echo '{"model":{"display_name":"Opus"}}' | tsx src/index.ts`.

Plain **`node src/index.ts` is not supported.** Node already strips TypeScript types on recent versions, but its ESM loader requires explicit `.ts` extensions on relative imports, which this project omits (bundler-style resolution). Use `tsx` — or Bun — instead.

Choosing Bun keeps things simplest: no extra global install, and it honors the supply-chain cooldown configured in `bunfig.toml` (see [Development](DEVELOPMENT.md)).

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
