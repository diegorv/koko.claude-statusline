// Component: agent execution status

import type { AgentInfo } from "../../parsing/transcript"
import { c, dim, formatDuration } from "../format"
import { spin } from "../constants"

/**
 * Renders agent execution status with spinner (running) or checkmark (completed) and elapsed time.
 * @param agents - Array of agent info objects.
 * @returns Array of formatted agent status strings.
 */
export function renderAgents(agents: AgentInfo[]): string[] {
  return agents.map(agent => {
    const icon = agent.running ? c("cyan", spin()) : c("green", "✓")
    return `${icon} ${agent.type} ${dim(`(${formatDuration(agent.elapsed)})`)}`
  })
}
