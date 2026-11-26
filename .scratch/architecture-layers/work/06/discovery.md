# Final architecture and compatibility

- README.md:19 promises a single entry point. Add the host matrix and identify the standalone command, OpenCode plugin and native Codex footer.
- docs/DEVELOPMENT.md:19 still describes AgentAdapter in core. Trace the actual command, reactive panel, core, renderer and export paths, and describe what to change for each extension.
- docs/LAYOUT.md:3 and docs/TUNING.md:3 need host-specific width, metric and export behavior. Check these against the adapters, panel and exporter.
- docs/INSTALL.md:3 and :153 need the public plugin entry and the tested bundle runtimes. Compare commands with CI and the release job.
- Use the regression tests delivered in work/01 through work/05, plus source and isolated bundle smoke runs on Bun and Node 22/24/26. Record live-host limits in validation.md. No production edits are planned.
