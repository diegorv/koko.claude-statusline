# Ledger: architecture-layers

This file is the source of truth for the progress of the [architecture-layers](spec.md) Issues. Read it before working on any of them. It is written only by `/relay-lite:run`, through `relay ledger`: never edit it by hand.

## Continue

```text
/relay-lite:run architecture-layers
```

Add Issue numbers to force them; `--all` runs every available Issue in sequence; `--all --parallel` runs the ones that touch different files at the same time.

## Process

The `relay-lite:workflow` workflow, one worktree per Issue at `<repo>.worktrees/issue-NN-slug`: build (discovery + implement), review (Claude or Codex), fix and re-review while changes are requested, deliver. Only deliver runs the full suite. Formats: relay-lite's `docs/format.md`.

## Statuses

| Status | Meaning |
|---|---|
| `todo` | Not started. |
| `in-progress` | Set by `/relay-lite:run` on `base` before it launches the Issue; still there after a run means it was interrupted (the worktree and branch may exist). `/relay-lite:run` asks what to do about it only when run with no Issue numbers (`--all` too), or when it is one of the named Issues or in the "Blocked by" of one; skip records nothing (no status change, no Log line, no commit), so the question comes back on the next such run. |
| `blocked` | Nothing was delivered: the build refused the Issue or returned nothing, the suite failing, a review or re-review that returned nothing, a re-review that still requests changes, a rebase conflict in source files, a failed push. The reason is in the Log; the worktree is kept. `/relay-lite:run` asks what to do about it only when run with no Issue numbers (`--all` too), or when it is one of the named Issues or in the "Blocked by" of one; skip records nothing (no status change, no Log line, no commit), so the question comes back on the next such run. |
| `in-review` | `pr` delivery: the PR is open, not merged yet; its URL is in Branch / PR. The next run checks it and sets `done` or `todo`. relay-lite does not delete the remote branch `issue/NN-slug` when the PR is merged or closed (GitHub does on merge if the repository auto-deletes head branches); after a close, delete it or renumber the Issue before the Issue runs again, or its push is rejected. |
| `done` | Delivered, and the Issue file says `Status: resolved`. |
| `wontfix` | Closed without work. |

## Next up

An Issue can start when its status is `todo` and every Issue in its "Blocked by" is `done`. Among those, take the lowest number.

## Issues

**Branch / PR**: in `merge` delivery `issue/NN-slug (<short sha>)`, the short sha of the Issue's squash commit on `base` (the `sha` deliver returns), written by `/relay-lite:run` in its `done` commit; in `pr` delivery the PR URL while `in-review`, then `<PR URL> (<short merge sha>)` once `/relay-lite:run` finds it merged; cleared when it finds the PR closed and sets the row back to `todo` (the URL stays in the `pr closed` Log line). **Merged**: always a date (YYYY-MM-DD); in `merge` delivery the date `/relay-lite:run` wrote the row, after the squash commit; in `pr` delivery the date `/relay-lite:run` recorded the merge. Both cells stay empty on a row `/relay-lite:ledger` created as `done` from an Issue file already `Status: resolved`.

| # | Issue | Blocked by | Status | Branch / PR | Merged |
|---|---|---|---|---|---|
| 01 | [Protect both runtime contracts before reorganizing the code](issues/01-protect-contracts-and-validation.md) | none | done | issue/01-protect-contracts-and-validation (69b429c) | 2026-11-26 |
| 02 | [Separate workspace data from local and remote sources](issues/02-separate-workspace-data-from-sources.md) | 01 | done | issue/02-separate-workspace-data-from-sources (b65596c) | 2026-11-26 |
| 03 | [Render the panel through a shared interface with explicit layout](issues/03-isolate-panel-rendering-and-layout.md) | 02 | done | issue/03-isolate-panel-rendering-and-layout (7725d66) | 2026-11-26 |
| 04 | [Consolidate OpenCode implementation inside the plugin package](issues/04-consolidate-opencode-integration.md) | 02 | todo | | |
| 05 | [Keep the shared snapshot free of ANSI and collection internals](issues/05-remove-presentation-escapes-and-collection-details.md) | 03 | todo | | |
| 06 | [Document the final architecture and verify installation compatibility](issues/06-document-and-verify-final-architecture.md) | 04, 05 | todo | | |

## Log

- 2026-11-26 19:18 — ledger created (6 Issues)
- 2026-11-26 19:18 — 01 — start — Codex-native build and independent review; no Claude workflow — 2f4a306
- 2026-11-26 19:26 — 01 — deliver — Codex review approved; both typechecks, 269 root and 9 plugin tests passed; Bun and Node 22/24/26 standalone smokes passed; relay ship merged and pushed — 69b429c
- 2026-11-26 19:26 — 02 — start — Codex-native build and independent review; blocker 01 delivered — 98eab38
- 2026-11-26 19:31 — 02 — deliver — Codex review approved; both typechecks, 269 root and 12 plugin tests passed; runtime smokes and reactive stale-response probe passed; merged and pushed — b65596c
- 2026-11-26 19:31 — 03 — start — Codex-native build and independent review; blocker 02 delivered — 6cc2ed7
- 2026-11-26 19:38 — 03 — deliver — Codex review approved; both typechecks, 269 root and 13 plugin tests passed; ANSI comparisons and runtime smokes passed; merged and pushed — 7725d66
