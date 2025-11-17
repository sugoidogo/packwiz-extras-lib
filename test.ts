import dotenv from 'dotenv'
import fs from 'node:fs'
import { spawnSync } from "node:child_process"

dotenv.config()
if (!fs.existsSync('modpack.zip')) {
    console.log('downloading test modpack...')
    const response = await fetch('https://mediafilez.forgecdn.net/files/7223/56/All%20the%20Mods%2010-5.1.zip')
    const zip = await response.bytes()
    fs.writeFileSync('modpack.zip', zip)
}
fs.mkdirSync('test', { recursive: true })
process.chdir('test')
spawnSync('packwiz', ['curseforge', 'import', '../modpack.zip'], { stdio: 'inherit' })
spawnSync('deno', ['run', '-P', '../main.ts', '--cf-detect', '--cf-url', '--mr-merge'], { stdio: 'inherit' })
process.chdir('..')
fs.rmSync('test', { recursive: true })

fs.mkdirSync('test', { recursive: true })
process.chdir('test')
spawnSync('packwiz', ['curseforge', 'import', '../modpack.zip'], { stdio: 'inherit' })
spawnSync('node', ['../main.ts', '--cf-detect', '--cf-url', '--mr-merge'], { stdio: 'inherit' })
process.chdir('..')
fs.rmSync('test', { recursive: true })

fs.mkdirSync('test', { recursive: true })
process.chdir('test')
spawnSync('packwiz', ['curseforge', 'import', '../modpack.zip'], { stdio: 'inherit' })
spawnSync('bun', ['run', '../main.ts', '--cf-detect', '--cf-url', '--mr-merge'], { stdio: 'inherit' })
process.chdir('..')
fs.rmSync('test', { recursive: true })