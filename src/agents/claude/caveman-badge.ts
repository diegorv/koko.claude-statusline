import type { HeaderAnnotation } from "../../core/snapshot.ts"
import type { CavemanState } from "./caveman.ts"

export function cavemanAnnotation(state: CavemanState | null): HeaderAnnotation | null {
  if (!state) return null
  const parts = [` ${state.mode}`]
  if (state.savings) parts.push(state.savings)
  return { color: "orange", parts }
}
