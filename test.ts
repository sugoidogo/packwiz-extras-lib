import dotenv from 'dotenv'
import fs from 'node:fs'
import spawnSync from './spawnSync.ts'
import { performance } from 'node:perf_hooks'
import download from './downloadProgress.ts'

dotenv.config({ quiet: true })
await download('https://mediafilez.forgecdn.net/files/7223/56/All%20the%20Mods%2010-5.1.zip', 'modpack.zip')

fs.mkdirSync('test', { recursive: true })
process.chdir('test')
spawnSync('packwiz', ['curseforge', 'import', '../modpack.zip'])
const bunStart = performance.now()
spawnSync('bun', ['run', '../src/cli.ts'])
//spawnSync('bun', ['run', '../main.ts', '--mr-detect'])
const bunEnd = performance.now()
process.chdir('..')
fs.rmSync('test', { recursive: true })