VERDICT: APPROVED

## Acceptance criteria

- [met] The provider obtains normalized workspace data only on the host that can access the supplied cwd. It never substitutes the provider process's current repository for an unavailable or remote workspace. — The server passes the displayed snapshot cwd to WorkspaceCache.read. The cache rejects relative, network and invalid paths. The collector starts Git with that explicit cwd and removes inherited Git repository overrides. The spawned-server fixture sets GIT_DIR and GIT_WORK_TREE to a different checkout and exercises missing, remote and non-repository directories.
- [met] Git and any supported linked-worktree enrichment run outside the resource-read response path, with bounded work, a bounded cache and at most one refresh in flight per workspace key. — The read performs bounded map operations and schedules collection with setImmediate. Only its callback launches processes. The cache keeps 16 entries, allows two concurrent refreshes and skips pending entries during eviction. Each refresh gets a 1.5-second budget and each subprocess has a 1 MiB output limit. The slow-Git fixture obtained five reads within one second and counted one outstanding Git invocation for the directory.
- [met] Cold-cache and failed-query reads still return useful session content. Cached results are reused only for the matching workspace and are refreshed under an explicit freshness policy. — An initial read returns the empty workspace alongside the supplied session fields. Successful and failed snapshots remain keyed by the literal cwd and have a three-second freshness period. The integration tests observe the stale branch until refresh, then the renamed branch, and verify that a failed rev-parse is cached.
- [met] Switching directory or thread while a query is pending cannot publish a previous selection's workspace into the new view; process shutdown cleans up outstanding work. — Each refresh updates its captured cache entry. The spawned provider test switches between two real worktrees while the first Git process is held, and verifies the branch, linked marker and thread identity after the delayed result arrives. Timeout and EOF tests check the child of a held Git process. An independent SIGTERM probe also verified that the Git process and its child were both reaped.
- [met] Sharing acquisition with the command respects the architecture rules and preserves the existing local collector's values and linked-worktree policy. OpenCode remains server-only for VCS. — Both runtimes share the pure Git and Worktrunk parsers. The synchronous CLI retains its command arguments, linked-worktree condition and normalized values. The panel and footer now share gitContent. The architecture test rejects a local workspace import from OpenCode. Existing panel byte, standalone runtime and remote-plugin tests passed.
- [met] Slow/failing Git, non-repositories, linked worktrees, eviction and selection races are tested through the actual provider path; all packages' required checks pass. — The new integration test starts integrations/codex/server.ts, sends resources/read over open stdio, creates real Git worktrees and uses gated processes to measure races, failure, eviction, timeout and shutdown. All three independent typechecks and the targeted checks passed. Relay ship owns the complete delivery suite.

## Checks

Reviewed 0bfa1b7 against main at 5fed299. The branch includes the authorized reservation update. The direct tree diff against main contains only implementation, tests and discovery in the reserved paths.

Fifteen targeted files passed at this tree, relay record:

- Root: `bun test tests/cli/workspace/git.test.ts tests/cli/workspace/worktrunk.test.ts tests/ui/components/git-status.test.ts tests/ui/components/workspace-info.test.ts tests/ui/panel-compatibility.test.ts tests/ui/render.test.ts tests/architecture.test.ts tests/cli.test.ts`.
- OpenCode: `bun test tests/workspace.test.ts tests/panel.test.ts tests/adapter.test.ts` in integrations/opencode.
- Codex: `bun test tests/workspace.test.ts tests/provider.test.ts tests/footer.test.ts tests/metrics.test.ts` in integrations/codex.

The standalone source/bundle smoke command `python3 /tmp/koko-standalone-smoke.py .` also has an exit-zero record at this tree. I independently ran all three package typechecks and two additional test files with `bun test tests/ui/lines.test.ts tests/export/pane-header.test.ts`. All 34 cases passed. A separate bounded macOS SIGTERM probe observed provider exit 1 on signal and verified cleanup of both the Git shim and its sleep child. The Windows process-tree cleanup branch was reviewed in source only.

## Findings

None.
