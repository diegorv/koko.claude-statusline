import type { Plugin } from "@opencode/plugin/tui"
import { mapOpenCodeGit } from "../../src/agents/opencode/git.ts"

type Client = Plugin.Context["client"]
type WorkspaceClient = { vcs: Pick<Client["vcs"], "get" | "status">; location: Pick<Client["location"], "get"> }

/** All paths and repository metadata belong to the connected server. */
export async function fetchWorkspace(client: WorkspaceClient, directory: string, signal: AbortSignal) {
  try {
    const input = { location: { directory } }
    const [info, status, project] = await Promise.all([
      client.vcs.get(input, { signal }),
      client.vcs.status(input, { signal }),
      client.location.get(input, { signal }),
    ])
    return { directory, git: mapOpenCodeGit(project.project.directory, info.data.branch.current, status.data.length > 0) }
  } catch { return { directory, git: null } }
}
