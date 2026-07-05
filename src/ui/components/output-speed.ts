// Component: live output speed (tokens/second) from the assistant samples window.

import type { AssistantSample } from "../../parsing/transcript.ts"
import { c, dim } from "../format.ts"

/**
 * If the most recent assistant turn is older than this (ms), the rate is
 * considered stale and not rendered — showing "42 tok/s" minutes after the
 * last response would be misleading.
 */
const FRESHNESS_MS = 10_000

/**
 * Minimum Δoutput between the two most recent samples for the rate to be
 * trustworthy. Two samples with only a handful of tokens between them produce
 * extremely noisy rates (e.g. 3 tokens in 0.05s reads as 60 tok/s but isn't
 * informative).
 */
const MIN_TOKEN_SPREAD = 200

/**
 * Renders the output token rate as `42 tok/s` (cyan number, dim unit), or
 * returns null when the rate would be stale or statistically meaningless.
 *
 * Callers must pass the same `assistantSamples` array stored on
 * `TranscriptData`. Two samples are needed for a delta; with fewer, returns
 * null without computing.
 *
 * @param samples - Sliding-window samples (oldest first). At least 2 required.
 * @param now - Current wall-clock time in ms (injectable for tests).
 */
export function renderOutputSpeed(samples: AssistantSample[], now: number = Date.now()): string | null {
  if (samples.length < 2) return null
  const last = samples[samples.length - 1]!
  const prev = samples[samples.length - 2]!

  if (now - last.t > FRESHNESS_MS) return null

  const deltaOutput = last.output - prev.output
  if (deltaOutput < MIN_TOKEN_SPREAD) return null

  const deltaSec = (last.t - prev.t) / 1000
  if (deltaSec <= 0) return null

  const rate = Math.round(deltaOutput / deltaSec)
  return `${c("cyan", `${rate}`)} ${dim("tok/s")}`
}
