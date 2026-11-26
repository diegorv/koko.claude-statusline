// Fields read from the OpenCode 2.x host and passed into normalization.
export interface Usage {
  input: number
  output: number
  reasoning: number
  cache: { read: number; write: number }
}

export interface ToolPart {
  type: string
  name?: string
  id?: string
  state?: { status: string; input?: Record<string, unknown> | string }
}

export interface Message {
  id: string
  type: string
  status?: string
  time: { created: number; completed?: number }
  model?: { id: string; providerID: string }
  tokens?: Usage
  content?: ToolPart[]
}

export interface OpenCodeInput {
  directory: string
  model?: { name: string; variant?: string }
  session?: { id: string; title?: string; tokens: Usage }
  cost?: number
  status?: "idle" | "running"
  /** Selected using the host's compaction/revert semantics. */
  context?: { tokens: Usage; limit: number }
  messages: readonly Message[]
  /** Messages at/after an undo boundary are excluded from activity. */
  revertMessageID?: string
  children: readonly { id: string; title?: string; agent?: string; running: boolean; outcome?: "succeeded" | "failed" | "interrupted" }[]
  mcps?: readonly { name: string; status: { status: string } }[]
}
