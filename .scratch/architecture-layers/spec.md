# Statusline architecture and integration reorganization

**Status:** approved — implementation authorized by the user on 2026-11-26.

## Problem and objective

The multi-agent expansion on November 26, 2026 preserved panel behavior but mixed presentation options with session data and split OpenCode implementation across two directory trees. This proposal consolidates the original 20-agent analysis of the nine commits between 6609f96 and 7b7e132, accounts for the subsequently added local agent configuration, and incorporates a second 20-agent review of ticket formatting and file ownership.

The objective is to keep host changes within their owning integration, visual changes within shared presentation, and existing installations working after every delivery. This migration adds no product features.

## Proposed decisions

- Keep two runtimes: a stdin command for Claude and Antigravity, and a reactive OpenCode plugin. Share normalized data and rendering while preserving their different lifecycles.
- Keep Claude and Antigravity modules compact, without a universal provider framework. Configuration, transcripts, parent-process detection, and Caveman remain Claude-owned.
- Consolidate OpenCode-exclusive mapping in the plugin package, separating pure normalization, host access, remote queries, and native presentation internally.
- Separate session/activity data, workspace data, and presentation options. Width, margin, and frame sizing are not session facts. Transcript paths and identifiers used only for collection do not belong in shared data.
- Give both runtimes one public panel-rendering interface. Content composition, wrapping, and framing remain internal modules of that renderer.
- Retain ANSI rendering and OpenTUI span conversion. Caveman annotations provide structured content and styling without escapes in the snapshot.
- Place terminal measurement and local workspace acquisition with the command. The plugin continues obtaining VCS from its server, including for remote sessions.
- Preserve the widget directory and pane-header exporter. A module can be shared across agents while still being specific to presentation or an output destination.
- Keep two manifests and lockfiles. Do not introduce published packages, package workspaces, generic utility directories, or new directory hierarchies for each widget.

## Proposed structure

Internal names guide navigation and may be refined during implementation if responsibilities and public paths remain stable.

```text
src/
  index.ts                      # stable public command entry point
  core/
    model.ts                    # normalized session and activity data
    snapshot.ts                 # shared snapshot without stdin protocol
    workspace.ts                # source-independent Git/Worktrunk data
  agents/
    claude/                     # Claude payload and exclusive data sources
    antigravity/                # Antigravity payload and exclusive rules
  cli/
    run.ts                      # command composition
    agents.ts                   # stdin adapter selection
    adapter.ts                  # command-side reading contract
    stdin.ts
    terminal-width.ts           # local terminal probing and stabilization
    debug.ts                    # optional command diagnostics
    workspace/                  # local Git and Worktrunk acquisition
  ui/
    render.ts                   # public panel interface
    rows.ts                     # internal content composition
    lines.ts                    # layout with explicit options
    layout.ts                   # options and pure override resolution
    format.ts
    constants.ts
    components/                 # existing widgets
  export/
    pane-header.ts              # Kitty/Herdr schema and writes
integrations/opencode/
  tui.tsx                       # stable public plugin entry point
  host.ts                       # SDK access and reactive host data
  workspace.ts                  # server-side VCS acquisition
  ansi.ts                       # native span conversion
  mapping/                      # input, adapter, context and VCS mapping
  tests/                        # normalization and SDK contract tests
tests/                          # command, stdin adapters and shared modules
```

## Dependency direction

- Core depends only on its own contracts and the language.
- Presentation and export consume core; they do not import agents, CLI modules, SDKs, the plugin, or concrete collectors.
- Stdin adapters know their own sources and shared contracts without importing other agents or command runtime code. They can satisfy the command's reading interface structurally, without a reverse import.
- The CLI composes stdin adapters, local acquisition, rendering, and export.
- The plugin composes its mapping, host, remote acquisition, rendering, and export.
- Nothing under src depends on the OpenCode package, Solid, or OpenTUI. Plugin normalization does not execute SDK, filesystem, subprocess, or lifecycle operations. Type-only references do not introduce runtime imports.
- The visual layer receives resolved options. A pure function can interpret overrides explicitly supplied by hosts, retaining the margin override in the plugin as well.

## Required compatibility

- Preserve src/index.ts, the statusline.mjs release artifact, and the installable integrations/opencode directory with its ./tui export.
- Preserve direct execution in Bun and the Node versions covered by CI, without standalone runtime dependencies.
- Preserve explicit agent selection before stdin reading, the Claude fallback, invalid-option errors, and silent invalid-stdin handling when no argument error exists.
- Claude retains its current margin/frame policy and width stabilization. Antigravity prioritizes payload width and falls back to local measurement. OpenCode uses its actual slot width.
- Preserve KOKO_STATUSLINE_* precedence over CLAUDE_STATUSLINE_* aliases, including the OpenCode margin override.
- Preserve colors, spaces, graphemes, wrapping, and frames for equivalent inputs and widths; control the clock in time-sensitive comparison cases.
- Preserve pane-header schema, filenames, permissions, and atomic writes. The command writes immediately; the plugin retains batching and cleanup. Session export can happen before the first slot measurement.
- Preserve remote VCS acquisition, cancellation, and rejection of stale directory responses in the plugin.

## Validation and execution

Every implementation ticket must finish independently verifiable with green CI. No shared integration branch is expected to remain broken between tickets. The current scope allows the renderer contract and both consumers to migrate in one ticket; a multi-ticket expand–contract sequence is unnecessary.

Root checks are `bun run typecheck` and `bun test`. For shared or plugin changes, install plugin dependencies with `bun install --cwd integrations/opencode --frozen-lockfile`, then run `bun run --cwd integrations/opencode typecheck` and `bun run --cwd integrations/opencode test`. Preserve CI's Node smoke checks and verify a locally generated bundle at completion.

The current relay-lite configuration includes only root checks. Ticket 01 must make the workflow validate the plugin as well while keeping dependencies isolated. Root-suite success alone does not validate OpenCode.

Each ticket declares a single Files line containing relative write paths, including both sources and destinations of planned moves. Future paths are valid. Paths have no backticks or globs; directory entries use a trailing slash. Read-only verification does not require reserving the files being checked. Update the declaration before changing an additional path.

Blocked by contains only `none` or comma-separated ticket IDs, without sentence-ending punctuation. It records functional prerequisites. Files lets relay-lite detect overlapping edits separately from those prerequisites. Shared directory reservations are intentional where a contract change affects multiple consumers and fixtures.

The six ticket files follow the installed relay-lite 0.8.44 template: title, What to build, Files, Blocked by, Status, acceptance checklist, optional scope, and a final Comments section. Ticket filenames, content, and this specification are in English.

## Sequence and dependencies

1. 01: Protect imports, representative behavior, and checks for both runtimes. No blockers.
2. 02, blocked by 01: Apply a neutral workspace contract to local/remote acquisition and the panel.
3. 03, blocked by 02: Introduce the panel interface and explicit layout in both runtimes, and organize command composition.
4. 04, blocked by 02: Consolidate OpenCode mapping and tests in the plugin. This does not require the layout change; preserve the new rendering interface if 03 is already delivered.
5. 05, blocked by 03: Remove ANSI and collection-only internals from the shared snapshot.
6. 06, blocked by 04 and 05: Document and verify the completed architecture.

After 02, tickets 03 and 04 can be chosen in either order, but overlapping writes prevent concurrent execution. Tickets 04 and 05 can also overlap if 03 finishes first. Files declarations cover both locations of OpenCode implementation and tests so scheduling remains safe in either order. Numeric order is the suggested execution sequence, not an additional dependency.

## Out of scope

- Adding a Codex adapter: this checkout uses Codex's native footer and has no custom Codex panel integration.
- Renaming the repository, publishing packages, redesigning the panel, or adding a second renderer.
- Unifying reactive polling with one-shot execution, creating a universal WorkspaceProvider, or creating a universal transcript parser.
- Changing metric calculations during file moves. Differences to investigate separately include missing percentages versus measured zero, OpenCode context usage including output/reasoning, and connected MCP servers versus successful calls in Claude. Preserve observed behavior and document these distinctions without claiming identical semantics.

## Breakdown review

The user approved starting all six issues on 2026-11-26. The breakdown and dependencies are approved, and the tickets are ready-for-agent. Execute them through relay-lite in dependency order, one workflow at a time, using the configured review, validation, and merge delivery process.
