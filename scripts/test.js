import dotenv from 'dotenv'
import fs from 'node:fs'
import spawnSync from './spawnSync.ts'
import download from './downloadProgress.ts'

dotenv.config({ quiet: true })
await download('https://mediafilez.forgecdn.net/files/7223/56/All%20the%20Mods%2010-5.1.zip', 'modpack.zip')

fs.mkdirSync('test', { recursive: true })
process.chdir('test')
spawnSync('packwiz', ['curseforge', 'import', '../modpack.zip'])
import * as packwiz from '../dist/packwiz.js'

const cfKey = process.env['CF_API_KEY']
if (!cfKey) {
    throw new Error('missing cf api key')
}
await packwiz.cfDetect('./pack.toml', cfKey)
    .then(results => console.debug(results.values().next().value))
await packwiz.cfUrl('./pack.toml', cfKey)
    .then(results => console.debug(results.values().next().value))
await packwiz.mrDetect('./pack.toml')
    .then(results => console.debug(results.values().next().value))
await packwiz.mrMerge('./pack.toml')
    .then(results => console.debug(results.values().next().value))

process.chdir('..')
fs.rmSync('test', { recursive: true })