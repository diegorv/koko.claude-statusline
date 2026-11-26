import { run } from "./cli/run.ts"

process.exitCode = run(process.argv.slice(2))
