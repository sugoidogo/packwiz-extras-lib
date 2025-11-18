import dotenv from 'dotenv'
import fs from 'node:fs'
import { spawnSync } from "node:child_process"
import { performance } from 'node:perf_hooks'

dotenv.config()
if (!fs.existsSync('modpack.zip')) {
    console.log('downloading test modpack...')
    const response = await fetch('https://mediafilez.forgecdn.net/files/7223/56/All%20the%20Mods%2010-5.1.zip')
    if (!response.ok) {
        console.error(response.statusText)
        process.exit(1)
    }
    const reader = response.body?.getReader()
    const writeStream = fs.createWriteStream('modpack.zip', { encoding: 'binary' })
    const totalSize = Number(response.headers.get('content-length'))
    let receivedSize = 0
    let chunk = await reader!.read()
    while (!chunk.done) {
        writeStream.write(chunk.value)
        receivedSize += chunk.value!.length
        const progress = Math.floor((receivedSize / totalSize) * 100)
        process.stdout.write(progress + '%\r')
        chunk = await reader!.read()
    }
    process.stdout.write('\n')
    writeStream.close()
}

fs.mkdirSync('test', { recursive: true })
process.chdir('test')
spawnSync('packwiz', ['curseforge', 'import', '../modpack.zip'], { stdio: 'inherit' })
console.log('testing with node')
const nodeStart = performance.now()
spawnSync('node', ['../main.ts', '--cf-detect', '--cf-url', '--mr-merge', '--mr-detect'], { stdio: 'inherit', 'shell': true })
const nodeEnd = performance.now()
process.chdir('..')
fs.rmSync('test', { recursive: true })

//process.exit()

fs.mkdirSync('test', { recursive: true })
process.chdir('test')
spawnSync('packwiz', ['curseforge', 'import', '../modpack.zip'], { stdio: 'inherit' })
console.log('testing with bun')
const bunStart = performance.now()
spawnSync('bun', ['run', '../main.ts', '--cf-detect', '--cf-url', '--mr-merge', '--mr-detect'], { stdio: 'inherit', 'shell': true })
const bunEnd = performance.now()
process.chdir('..')
fs.rmSync('test', { recursive: true })

fs.mkdirSync('test', { recursive: true })
process.chdir('test')
spawnSync('packwiz', ['curseforge', 'import', '../modpack.zip'], { stdio: 'inherit' })
console.log('testing with deno')
const denoStart = performance.now()
spawnSync('deno', ['run', '-P', '../main.ts', '--cf-detect', '--cf-url', '--mr-merge', '--mr-detect'], { stdio: 'inherit', 'shell': true })
const denoEnd = performance.now()
process.chdir('..')
fs.rmSync('test', { recursive: true })

console.log('node', (nodeEnd - nodeStart)/1000)
console.log('bun ', (bunEnd - bunStart)/1000)
console.log('deno', (denoEnd - denoStart)/1000)