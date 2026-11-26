# Panel rendering and layout

- src/ui/lines.ts:103 probes width and reads process overrides. Move the probe into the command and pass final options into framing. Keep the wrap and grapheme algorithm.
- src/ui/render.ts:57 composes rows. Put composition in rows.ts and expose the framed output and diagnostic row counts through render.ts.
- src/index.ts:15 selects the adapter before reading stdin. Move this sequence intact into cli/run.ts, reuse its chosen width for debug output, and retain the transcript-derived stabilization key.
- integrations/opencode/tui.tsx:37 currently reads slot width while acquiring session data. Keep acquisition and batched export on one memo, with a separate presentation memo that reads width and workspace.
- Add a small plugin module for this production reactive composition so it can run under Solid with controlled input and export observation. Reserve the path before implementing it.
- Reuse work/01's byte-level fixtures and both hosts' smoke checks, moving terminal-probe tests with the probe. Verify display at multiple widths and export before the first measurement.
