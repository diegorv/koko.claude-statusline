VERDICT: CHANGES_REQUESTED

## Acceptance criteria

- [met] A small shared content contract represents semantic groups, text and styles without Codex types, environment access, collection I/O or embedded ANSI escapes. — The group discriminator and ordered styled spans in `src/ui/content/session.ts` depend only on the core effort type. The semantic group test exercises model, effort, state, session and cost.
- [not met] The existing public panel interface consumes the shared content and preserves colors, graphemes, spaces, wrapping and frames for controlled representative scenarios. — `render` retains its public signature, and the committed wide and narrow fixtures match output captured at `1e5f71f` before production changed. An additional session-title scenario displays formerly invisible terminal hyperlink metadata. See finding 1.
- [met] The command and OpenCode retain their distinct viewport policies, environment precedence, pane-header timing and reactive resize behavior. — The change leaves viewport resolution, the command runner, the OpenCode panel and the exporter intact. The recorded terminal width, CLI, pane-header and measured-slot panel checks cover these paths.
- [met] Presentation calculations are shared rather than copied into a second set of widgets; no general-purpose UI framework is introduced. — Effort style selection and cost formatting each have one owner in `content/session.ts`. The existing components and header call those builders and use the single span serializer in `format.ts`.
- [met] Architecture rules enforce the new separation, and both existing packages' typechecks, targeted regressions and complete delivery checks pass. — The architecture test classifies the content directory and exercises forbidden imports of terminal formatting, an SDK and a Node builtin. Both independent typechecks passed, and relay recorded passing targeted regressions on the reviewed tree. Per relay review policy, the full suite remains the ship driver's delivery gate.

## Findings

1. Major, `src/ui/content/session.ts:16`. A Claude session name may contain a terminal hyperlink. The previous ANSI panel displayed its label, but the new regular expression removes only the escape and terminator from an OSC sequence. A bounded probe passed an OSC-8 link with the label `Release notes` into `sessionContent` and got `]8;;https://example.org/Release notes]8;;`. This changes the visible text and occupies extra columns in the frame. Strip the complete OSC sequence, retaining the label, and add tests for the usual BEL and ST terminators through the shared content and public panel.

## Checks

Reviewed `main...8af2ff4`. All changed files fall under the ticket's reservations. I independently ran `bun run typecheck` and `bun run --cwd integrations/opencode typecheck` under relay timeout. Both exited zero.

Fourteen test files passed at this tree, relay record:

- Root: `bun test tests/architecture.test.ts tests/ui/content.test.ts tests/ui/panel-compatibility.test.ts tests/ui/render.test.ts tests/ui/lines.test.ts tests/ui/format.test.ts tests/ui/components/activity-title.test.ts tests/ui/components/effort.test.ts tests/cli.test.ts tests/cli/terminal-width.test.ts tests/export/pane-header.test.ts`.
- OpenCode: `bun test tests/panel.test.ts tests/ansi.test.ts tests/workspace.test.ts` from `integrations/opencode/`.

I cited fourteen covered test files and ran zero uncovered files. I independently ran the targeted terminal hyperlink probe described above. Relay also recorded exit zero for the isolated source/bundle smoke script on this tree. Its checks cover both stdin hosts under Bun and Node 22, 24 and 26.

## Resolution

- Finding 1 fixed in `a47b5a0`. The text boundary consumes OSC metadata through BEL or ST and retains the visible hyperlink label. Semantic regressions cover both terminators, C1 encoding, DCS and a truncated control string. The public Claude panel fixture compares each linked title's entire output with its plain label. Both typechecks and 48 targeted tests passed. The standalone source/bundle probe passed all 16 invocations on Bun and Node 22, 24 and 26.
