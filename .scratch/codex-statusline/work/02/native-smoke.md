# Stock CLI rendering observation

On 2026-11-27 the coordinating Codex session exercised Koko on macOS 26.6.2 (Darwin 25.6.0, arm64), with codex-cli 0.172.0 and Bun 1.4.5. The shell started the real TUI in an 80-column, 24-row PTY, in inline mode. The coordinating session supplied the terminal capture at `/tmp/koko-native-02-inline.log`. Inspection of that capture confirmed the displayed version, rendered footer, picker, and thread ID.

The CLI command was `/Users/diegorv/.local/bin/codex --no-daemon --no-alt-screen`. The temporary root was `/var/folders/g9/dtxqryks7kx_j19dxrqyrgph0000gn/T/koko-native-cli-fy1_152q`. The environment selected `home/` below that root as HOME, `home/codex/` as CODEX_HOME and `workspace/` as the working directory. A placeholder credential allowed opening the TUI. No model request was made.

The temporary user configuration enabled `features.tui_extensions_statusline` and selected `{ server = "koko-statusline", tool = "statusline" }` under `tui.status_line_provider`. The server ran `/opt/homebrew/bin/bun /Users/diegorv/Dev/pet-projects/koko/claude-statusline.worktrees/issue-02-display-native-codex-footer/integrations/codex/server.ts`.

The terminal displayed colored text reading `GPT-6-Sol effort: medium ready 01a21cb2-8142-7c32-90dd-f2e4a980657b`. Opening `/statusline` and choosing **Choose a status line provider** showed **Koko (current)** with the expected server/tool pair. Enter reselected the provider and Escape returned to the footer. Ctrl-C exited with status zero. All writes used the temporary user configuration.

The protocol fixture separately exercises malformed messages, partial frames, bounded reads, and two threads sharing a cwd. This native observation covered one idle thread. Usage refreshes during a model turn, actual thread switching and terminal resizing, fullscreen mode, the 0.171.0 binary, Linux, and Windows were not exercised here.
