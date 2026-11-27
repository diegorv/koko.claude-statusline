# Final integration verification

- README.md's host matrix currently sends Codex users to the built-in footer. Connect it and docs/INSTALL.md to the package registration guide.
- docs/DEVELOPMENT.md:5 covers only two packages. Update the three lifecycles and dependency map against tests/architecture.test.ts. Extend docs/CODEX.md with the implemented metric and workspace semantics, released UI limits and isolated verification. Scope existing layout/tuning guidance to the appropriate panel hosts.
- Existing provider, registration, workspace, panel, export and architecture tests exercise the regression requirements. Run focused files and all three typechecks. Verify the public OpenCode export and standalone entry and bundle under Bun and Node 22/24/26 with isolated sources.
- Follow work/02/native-smoke.md using the final registration command. Exercise a real stock TUI in temporary homes, actual terminal resizing and fresh threads where available. Record exact versions, modes, commands, observed output and checks requiring an owner in validation.md. Keep generated terminal captures outside the repository.
