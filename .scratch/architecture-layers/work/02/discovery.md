# Workspace boundaries

- Move the contracts at src/collection/git.ts:5 and src/collection/worktrunk.ts:5 to src/core/workspace.ts. Preserve nullable remote counts and the local empty-repository result.
- Place both subprocess collectors under src/cli/workspace/ and move the linked-worktree check at src/index.ts:34 into their command-side entry point. Exercise it using the temporary Git repository pattern in tests/collection/git.test.ts.
- Pass one WorkspaceSnapshot to src/ui/render.ts:58 from the command and integrations/opencode/tui.tsx:47. The widget needs only the shared field types.
- Keep the three server requests in integrations/opencode/workspace.ts:8. Tie each response to the session and directory that initiated it, so the previous resource value is hidden while the next request is pending. Exercise cancellation, timeout and subdirectory root naming with a test client.
- Update the classification and migration exceptions in tests/architecture.test.ts:10 and the responsibility map in docs/DEVELOPMENT.md:14. The checks from work/01 apply to both packages.
