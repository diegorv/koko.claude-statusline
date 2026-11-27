# Native Codex footer

Koko runs as a persistent stdio MCP server for the experimental custom statusline in stock Codex CLI 0.171.0 and 0.172.0. It displays the model, reasoning effort, run state, and thread name or ID when the current snapshot supplies them. The host wraps the native row and controls the space available to it.

## Register on the connected app-server host

Keep this checkout on a stable path accessible to the app-server host. Run the following commands there, from the checkout root, with Bun installed. First inspect any existing registration named `koko-statusline` with `codex mcp list`. If that name belongs to another server, keep the existing registration.

```sh
codex mcp add koko-statusline -- "$(command -v bun)" "$PWD/integrations/codex/server.ts"
```

This adds a user-level MCP server. A project-level MCP or plugin override can make the provider ineligible. Enable **Custom status line** in `/experimental`, restart the TUI, and start a new conversation. In `/statusline`, open **Choose a status line provider** and select **Koko**. Codex persists the server name `koko-statusline` and tool name `statusline`. Once selected, each read of `ui://koko-statusline/footer` uses the thread currently displayed. If a read fails, press F2 to inspect the attempt and reselect Koko to resume polling. Restart the stdio server after editing its code.

## Isolated smoke check

From the checkout root, exercise the actual provider process and the native picker separately. The fixture starts the process, discovers the resource, and changes the displayed thread over one open stream.

```sh
(cd integrations/codex && bun test tests/provider.test.ts)
```

For a native observation, open a fresh shell and run the following in a subshell. The scratch user configuration and workspace stay under one temporary directory. Follow the picker steps above, note the Codex version, OS and display mode, then exit the TUI. Fullscreen and inline modes may allocate different numbers of rows. No credentials are copied into this setup. If the CLI requires login, record that limitation or use a dedicated test account.

```sh
(
  checkout="$PWD"
  runtime="$(command -v bun)"
  codex_bin="$(command -v codex)"
  scratch="$(mktemp -d)"
  trap 'rm -rf "$scratch"' EXIT
  mkdir -p "$scratch/home" "$scratch/codex" "$scratch/workspace"
  export HOME="$scratch/home" CODEX_HOME="$scratch/codex"
  cd "$scratch/workspace" || exit 1
  "$codex_bin" --version
  "$codex_bin" mcp add koko-statusline -- "$runtime" "$checkout/integrations/codex/server.ts"
  "$codex_bin" features enable tui_extensions_statusline
  "$codex_bin" --no-daemon
)
```

The protocol fixture measures resource reads. Thread switching in that test is simulated. Rendering, picker selection and terminal resize require a native observation.

The [released provider guide](https://github.com/openai/codex/blob/rust-v0.171.0/codex-rs/skills/src/assets/samples/create-statusline/SKILL.md) and [released snapshot and UI types](https://github.com/openai/codex/blob/rust-v0.171.0/codex-rs/skills/src/assets/samples/create-statusline/references/statusline.d.ts) define the supported protocol.
