# Registration and removal

- `docs/CODEX.md:5` describes manual registration. Add a separately invoked installer in the Codex package for preview, install, doctor and removal. The provider continues to start at `integrations/codex/server.ts` with the names from `protocol.ts`.
- Target `config.toml` inside the app-server host's user Codex home. Use a format-preserving TOML editor for the three managed settings and record only the values Koko owns. Compare current ownership during removal. Preserve concurrent edits and make retries safe across configuration and receipt writes.
- Exercise the public commands with isolated temporary homes and workspaces. Cover previous selection, quoted paths, conflicting registrations, unsupported versions, project overrides, read-only previews/diagnostics and interrupted operations. Update the setup and recovery guide.
