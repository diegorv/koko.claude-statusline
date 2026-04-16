// Component: todo progress display

import { c, dim } from "../format"

/**
 * Renders todo progress: current in-progress task or "All complete" message.
 * @param todos - Todo progress data with total, completed count, and current task.
 * @returns Formatted todo progress string, or null if no todos.
 */
export function renderTodos(todos: { total: number; completed: number; current: string | null }): string | null {
  const { total, completed, current } = todos
  if (total <= 0) return null
  if (current) {
    const label = current.length > 35 ? current.slice(0, 32) + "..." : current
    return `${c("yellow", "▸")} ${label} ${dim(`(${completed}/${total})`)}`
  }
  if (completed === total) {
    return `${c("green", "✓")} All complete ${dim(`(${total}/${total})`)}`
  }
  return `${c("yellow", "▸")} ${dim(`(${completed}/${total})`)}`
}
