import { existsSync } from "@std/fs/exists"
import * as dotenv from '@std/dotenv'

dotenv.loadSync({ export: true })
if (!existsSync('modpack.zip')) {
    console.log('downloading test modpack...')
    const response = await fetch('https://mediafilez.forgecdn.net/files/7223/56/All%20the%20Mods%2010-5.1.zip')
    const zip = await response.bytes()
    Deno.writeFileSync('modpack.zip', zip)
}
Deno.mkdirSync('test', { recursive: true })
Deno.chdir('test')
await new Deno.Command('packwiz', { args: ['curseforge', 'import', '../modpack.zip'] }).spawn().status
const status = await new Deno.Command('deno', { args: ['run', '-P', '../main.ts', '--cf-detect', '--cf-url', '--mr-merge'] }).spawn().status
//await new Deno.Command('packwiz', { args: ['modrinth', 'export'] }).spawn().status
Deno.chdir('..')
Deno.removeSync('test', { recursive: true })
Deno.exit(status.code)