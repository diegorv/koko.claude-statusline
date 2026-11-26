// Component: agent execution status

import type { AgentInfo } from "../../model.ts"
import { c, dim, formatDuration } from "../format.ts"
import { spin } from "../constants.ts"

/**
 * Renders agent execution status with spinner (running) or checkmark (completed) and elapsed time.
 * @param agents - Array of agent info objects.
 * @returns Array of formatted agent status strings.
 */
export function renderAgents(agents: AgentInfo[]): string[] {
  return agents.map(agent => {
    const icon = agent.running ? c("cyan", spin()) : c("green", "✓")
    const elapsed = agent.elapsed === null ? "" : " " + dim(`(${formatDuration(agent.elapsed)})`)
    return `${icon} ${agent.type}${elapsed}`
  })
}
