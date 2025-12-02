import { type SpawnSyncOptions, spawnSync as nodeSpawnSync } from 'node:child_process'

export default function spawnSync(command: string, args?: readonly string[], options: SpawnSyncOptions = {}) {
    if (!options.stdio) options.stdio = 'inherit' // I wanna know what's going on
    if (!options.shell) options.shell = true // Windows requires this for PATHEXT support
    const result = nodeSpawnSync(command, args, options)
    if (result.error) throw result.error // Don't silently fail
    if (result.status !== 0) process.exit(result.status) // Don't continue if a command fails
    return result
}