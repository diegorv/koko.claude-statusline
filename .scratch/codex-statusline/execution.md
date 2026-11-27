# Codex-native execution

Authorized on 2026-11-27 for all seven issues and commit, merge and push delivery. The approved acceptance criteria and functional dependency graph are unchanged; Files declarations reserve writes and do not add dependencies.

Use native Codex implementers and separate native Codex reviewers with the inherited model. The main session exclusively owns the ledger through the installed relay 0.8.44 CLI. Do not invoke Claude, Workflow, relay next, relay launch, relay codex-review or relay finish. Use actual bounded check records, explicit review-lint, suite reset/run/wait, deliver ship and check merged. No synthetic workflow or usage records.

Configuration verified: main, origin, merge; one configured fix/re-review round, with delivery fixes and independent review when needed. Each issue runs serially in its own issue/NN-slug branch and sibling worktree. Planning is committed before worktrees; setup uses frozen lockfiles. Issue 02 adds its package to CI and relay checks immediately. Resolve validation from the worktree configuration at each delivery gate.

Initial main HEAD: b6b035a (clean, one commit ahead of origin/main after fetch). Existing detached Codex worktree is preserved. No issue branches or interrupted Codex ledger were present. Installed codex-cli: 0.172.0. Native checks use isolated homes/configuration and record actual observations separately from fixtures and owner-only checks. Live user configuration must remain untouched.
