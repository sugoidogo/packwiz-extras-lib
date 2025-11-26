import dotenv from 'dotenv'
import fs from 'node:fs'
import spawnSync from './spawnSync.ts'
import { performance } from 'node:perf_hooks'
import download from './downloadProgress.ts'

dotenv.config({ quiet: true })
if (!fs.existsSync('modpack.zip')) {
    console.log('downloading test modpack...')
    await download('https://mediafilez.forgecdn.net/files/7223/56/All%20the%20Mods%2010-5.1.zip', 'modpack.zip')
}
/*
fs.mkdirSync('test', { recursive: true })
process.chdir('test')
spawnSync('packwiz', ['curseforge', 'import', '../modpack.zip'])
console.log('testing with node')
const nodeStart = performance.now()
spawnSync('node', ['../main.ts', '--cf-detect', '--cf-url', '--mr-merge', '--mr-detect'])
const nodeEnd = performance.now()
process.chdir('..')
fs.rmSync('test', { recursive: true })
*/
//process.exit()

fs.mkdirSync('test', { recursive: true })
process.chdir('test')
spawnSync('packwiz', ['curseforge', 'import', '../modpack.zip'])
console.log('testing with bun')
const bunStart = performance.now()
spawnSync('bun', ['run', '../main.ts', '--cf-detect', '--cf-url', '--mr-merge', '--mr-detect', '--test-server', '--test-client'])
const bunEnd = performance.now()
process.chdir('..')
fs.rmSync('test', { recursive: true })
/*
fs.mkdirSync('test', { recursive: true })
process.chdir('test')
spawnSync('packwiz', ['curseforge', 'import', '../modpack.zip'])
console.log('testing with deno')
const denoStart = performance.now()
spawnSync('deno', ['run', '-P', '../main.ts', '--cf-detect', '--cf-url', '--mr-merge', '--mr-detect'])
const denoEnd = performance.now()
process.chdir('..')
fs.rmSync('test', { recursive: true })

console.log('node', (nodeEnd - nodeStart)/1000)
console.log('bun ', (bunEnd - bunStart)/1000)
console.log('deno', (denoEnd - denoStart)/1000)
*/