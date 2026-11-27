# Native Codex footer

Koko runs as a persistent stdio MCP server for the experimental custom statusline in stock Codex CLI 0.171.0 and 0.172.0. Each resource read describes the thread currently displayed. The provider returns one JSON text resource at the requested URI. A successful read starts a one-second wait before the next poll. Each read has its own one-second deadline.

## Reading the footer

| Group, in display order | What the figures mean |
|---|---|
| Model and effort | The displayed model and its reported reasoning level. |
| Context | The percentage used, occupied tokens and capacity of the current context. Each value can arrive independently. |
| Quotas | Each account limit keeps its ID. The reported duration identifies a five-hour or seven-day window in either slot. Other durations retain their own labels. The bar saturates at 100% while the number shows actual **consumed** usage, including values above 100%. A reported future reset adds a countdown refreshed on each read. |
| State and session consumption | The agent state, uncached input (↑), output (↓), cache reads and cache writes. Codex's total input already includes cached input. Each observed category appears separately. Missing categories stay hidden, and reported zero is a value. |
| Cost and session identity | Only host-reported USD appears as currency. Credits have no USD conversion. The thread name or ID identifies the session. |
| Git | Local branch and worktree details appear when available on the provider host. A cold cache displays session data immediately. A background refresh uses Git and, for linked worktrees, optional Worktrunk. Up to 16 directories are cached, with a three-second freshness interval and a 1.5-second budget per refresh. |

The released snapshot omits tool history, subagents, timing samples and session edit counts. The footer does not infer activity, speeds or charges from local logs.

The released UI contract supports text, links, rows and text styles. Koko emits styled text groups in a wrapping row with a one-column gap. The host supplies no usable footer width and chooses its own height, depending on inline or fullscreen mode, available rows and hints. Narrow windows may clip later groups. The host limits a tree to 64 KiB of JSON, 16 KiB of UTF-8 leaf text, 256 non-null nodes and depth 16. Koko bounds output before responding.

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

For a native observation, open a fresh shell and run the following in a subshell. The scratch user configuration and workspace stay under one temporary directory. Follow the picker steps above, note the Codex version, OS and display mode, then exit the TUI. Fullscreen and inline modes may allocate different numbers of rows. Start the subshell with a dedicated test environment. For an offline idle-footer check, a placeholder credential in the temporary home lets you open the TUI without a model turn. For live account metrics, use a dedicated test account.

```sh
(
  checkout="$PWD"
  runtime="$(command -v bun)"
  codex_bin="$(command -v codex)"
  scratch="$(mktemp -d)"
  trap 'rm -rf "$scratch"' EXIT
  mkdir -p "$scratch/home" "$scratch/codex" "$scratch/workspace"
  cd "$scratch/workspace" || exit 1
  isolated() {
    env -i HOME="$scratch/home" CODEX_HOME="$scratch/codex" PATH="$PATH" TERM="${TERM:-xterm-256color}" "$@"
  }
  isolated "$codex_bin" --version
  printf '%s\n' sk-isolated-placeholder | isolated "$codex_bin" login --with-api-key
  isolated "$runtime" "$checkout/integrations/codex/register.ts" preview
  isolated "$runtime" "$checkout/integrations/codex/register.ts" install
  isolated "$runtime" "$checkout/integrations/codex/register.ts" doctor
  isolated "$codex_bin" --no-daemon                  # fullscreen when the terminal permits it
  isolated "$codex_bin" --no-daemon --no-alt-screen  # inline
  isolated "$runtime" "$checkout/integrations/codex/register.ts" remove
)
```

For each mode, choose Koko in the picker and check the model, run state and thread name or ID. Resize the terminal from wide to narrow and back with shortcut hints visible. Open `/new`, choose the current workspace if prompted, and compare thread IDs. For Git, use a temporary Git repository with one commit and allow another poll after the cold read. The [verification record](../.scratch/codex-statusline/work/07/validation.md) identifies which observations were made on stock releases and which scenarios use fixtures.

The [released provider guide](https://github.com/openai/codex/blob/rust-v0.171.0/codex-rs/skills/src/assets/samples/create-statusline/SKILL.md) and [released snapshot and UI types](https://github.com/openai/codex/blob/rust-v0.171.0/codex-rs/skills/src/assets/samples/create-statusline/references/statusline.d.ts) define the supported protocol.
