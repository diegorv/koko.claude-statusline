# Native Codex footer

Koko runs as a persistent stdio MCP server for the experimental custom statusline in stock Codex CLI 0.171.0 and 0.172.0. It displays the model, reasoning effort, run state, and thread name or ID when the current snapshot supplies them. The host wraps the native row and controls the space available to it.

## Register on the connected app-server host

Keep this checkout at a stable path accessible to the connected app-server host. Run the installer on that host. It uses `$CODEX_HOME/config.toml` or `~/.codex/config.toml` when `CODEX_HOME` is unset. A remote executor and its app server can have different filesystems. To diagnose project overrides, run the command from the workspace you intend to open and use the absolute path to the checkout.

From the checkout root, install the registration command's TOML parser and preview the changes.

```sh
bun install --cwd integrations/codex --frozen-lockfile
bun integrations/codex/register.ts preview
bun integrations/codex/register.ts install
bun integrations/codex/register.ts doctor
```

The preview names the configuration file and each change. Installation registers the current Bun executable and the absolute path to `integrations/codex/server.ts` as the user-level stdio server `koko-statusline`, enables `features.tui_extensions_statusline`, and selects the `statusline` tool. A conflicting server under that name requires resolution by its owner. The helper supports Codex CLI 0.171.0 and 0.172.0. Project-level MCP or plugin overrides can make a user-level provider ineligible. Doctor checks the current workspace for project server registrations and for feature or selection settings that override the user configuration when the project is trusted.

Restart Codex and start a conversation in the workspace. Open **Choose a status line provider** in `/statusline` and select **Koko**. Codex reads the displayed thread from `ui://koko-statusline/footer`. After a failed read, press F2 to inspect the error, correct the problem, and reselect Koko to restart polling. Restart the stdio process after changing the provider's code.

Run `bun integrations/codex/register.ts remove` to undo an installation. The installer keeps a private `koko-statusline-registration.json` receipt beside the config. Removal restores each previously owned value if the current setting still matches. If you have chosen another custom provider, removal keeps that selection and the enabled feature. If removing a managed setting would erase a comment inside its value, removal reports the retained setting and leaves that block for you to edit. A registration that already existed before installation stays in place. After moving the checkout, remove the old registration before installing from its new path.

The helper writes each file by atomic rename and saves the receipt before changing the config. If a process stops during a write, rerun the same command to finish. A killed process can leave `koko-statusline-registration.json.lock`. Check the PID recorded there and remove **only the lock** after verifying the process has stopped. If the config has also changed since an interrupted write, keep copies of both files, compare the receipt's managed settings with the current values, and reconcile those settings manually before retiring the receipt. The helper refuses to replace a symlinked configuration file.

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
  "$runtime" "$checkout/integrations/codex/register.ts" preview
  "$runtime" "$checkout/integrations/codex/register.ts" install
  "$runtime" "$checkout/integrations/codex/register.ts" doctor
  "$codex_bin" --no-daemon
  "$runtime" "$checkout/integrations/codex/register.ts" remove
)
```

The protocol fixture measures resource reads. Thread switching in that test is simulated. Rendering, picker selection and terminal resize require a native observation.

The [released provider guide](https://github.com/openai/codex/blob/rust-v0.171.0/codex-rs/skills/src/assets/samples/create-statusline/SKILL.md) and [released snapshot and UI types](https://github.com/openai/codex/blob/rust-v0.171.0/codex-rs/skills/src/assets/samples/create-statusline/references/statusline.d.ts) define the supported protocol.
