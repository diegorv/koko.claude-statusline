# Shared styled content

- `src/ui/lines.ts:41` selects and colors the model, and line 58 formats cost. `src/ui/components/effort.ts:17` maps effort to a label and style. `src/ui/rows.ts:91` places state in an activity row, and `src/ui/components/activity-title.ts:51` appends the session name.
- Extract those shared fields as semantic groups of styled text under `src/ui/content/`. Serialize these groups with the existing ANSI helpers. Keep the frame, context gradient and host-specific activity widgets in place. Future quota, consumption and workspace issues can extend the shared contract at the point of use.
- `tests/architecture.test.ts:10` classifies production directories. Allow content to use only its own layer and normalized core data and test forbidden imports in the existing fixture.
- Capture byte-for-byte fixtures from the pre-refactor public renderer using a fixed clock and explicitly resolved command and plugin layouts. Include wide graphemes, nonbreaking spaces, effort, state, cost and inline color transitions. Also run the existing header, row, width, pane-header and measured-slot regressions.
- `src/cli/run.ts` and `integrations/opencode/panel.ts` own dimensions and pane-header timing. Their public calls and host policies require no changes.
