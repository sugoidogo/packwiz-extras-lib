import murmurHash from './murmur2.js'
import * as TOML from '@std/toml'
import * as Path from '@std/path'
import { parseArgs } from '@std/cli'
import { crypto } from '@std/crypto'
import { encodeHex } from "@std/encoding/hex"

type indexEntry = {
    file: string,
    hash: string,
    metafile?: true
}

type metaData = {
    name: string,
    filename: string,
    side: string,
    download: {
        "hash-format": string,
        "hash": string,
        url?: string,
        mode?: 'metadata:curseforge',
    }
    update: {
        curseforge?: {
            "file-id": number,
            "project-id": number,
        },
        modrinth?: {
            "mod-id": string,
            "version": string,
        }
    }
}

const args = parseArgs(Deno.args, {
    string: ['index', 'cf-api-key'],
    boolean: ['cf-detect', 'cf-url', 'mr-detect', 'mr-merge'],
    default: { 'index': 'index.toml' }
})

if (!(args["cf-detect"] || args["cf-url"] || args["mr-detect"] || args["mr-merge"])) {
    console.log("usage: packwiz-util [--index=index.toml] [--cf-api-key='CF_API_KEY'] [--cf-detect] [--cf-url] [--mr-detect] [--mr-merge]")
    Deno.exit()
}

function get_response(response: Response) {
    if (!response.ok) {
        console.error(response.statusText)
        Deno.exit(1)
    }
    return response.json()
}

function get_key() {
    const cfKey = args["cf-api-key"]
    if (!cfKey) {
        console.error('--cf-api-key required')
        Deno.exit(1)
    }
    return cfKey
}

async function get_index() {
    const status = await new Deno.Command('packwiz', { args: ['refresh'] }).spawn().status
    if (!status.success) {
        Deno.exit(status.code)
    }
    return TOML.parse(Deno.readTextFileSync('index.toml')).files as indexEntry[]
}

function read_metadata_file(path: string) {
    return TOML.parse(Deno.readTextFileSync(path)) as metaData
}

function write_metadata_file(path: string, metadata: metaData) {
    return Deno.writeTextFileSync(path, TOML.stringify(metadata))
}

if (args["cf-detect"]) {
    console.log('cf-detect')
    const cfKey = get_key()
    const fingerprints = new Map()
    const nullHash = murmurHash(new Uint8Array(), 1, true)
    const index = await get_index()
    console.log('hashing files, this may take a while...')
    for (const entry of index) {
        if (entry.metafile) continue
        const hash = murmurHash(Deno.readFileSync(entry.file), 1, true)
        if (hash === nullHash) continue
        fingerprints.set(hash, entry.file)
    }
    console.log(`checking ${fingerprints.size} files`)
    const matches = await fetch('https://api.curseforge.com/v1/fingerprints', {
        'method': 'POST',
        'headers': {
            'content-type': 'application/json',
            'accept': 'application/json',
            'x-api-key': cfKey
        },
        body: JSON.stringify({ fingerprints: Array.from(fingerprints.keys()) })
    }).then(get_response)
    for (const match of matches.data.exactMatches) {
        const path = fingerprints.get(match.file.fileFingerprint)
        Deno.removeSync(path)
        const status = await new Deno.Command('packwiz', {
            args: ['curseforge', 'add',
                '--addon-id', match.file.modId,
                '--file-id', match.file.id,
                '--meta-folder', Path.dirname(path)]
        }).spawn().status
        if (!status.success) {
            Deno.exit(status.code)
        }
    }
}

if (args["cf-url"]) {
    console.log(`cf-url`)
    const cfKey = get_key()
    for (const entry of await get_index()) {
        if (!entry.metafile) continue
        const metadata = read_metadata_file(entry.file)
        if (metadata.download.url || !metadata.update.curseforge) continue
        console.log(`caching url for ${metadata.name}`)
        const json = await fetch(`https://api.curseforge.com/v1/mods/${metadata.update.curseforge['project-id']}/files/${metadata.update.curseforge['file-id']}/download-url`, {
            'headers': {
                'accept': 'application/json',
                'x-api-key': cfKey
            }
        }).then(get_response)
        const url = json.data
        delete metadata.download.mode
        metadata.download.url = url
        write_metadata_file(entry.file, metadata)
    }
}

if (args["mr-detect"]) {
    console.debug('mr-detect')
    const hashes = new Map()
    for (const entry of await get_index()) {
        if (!entry.metafile) {
            const file = Deno.openSync(entry.file, { read: true }).readable
            const hash = encodeHex(await crypto.subtle.digest('SHA-1', file))
            hashes.set(hash, entry.file)
            continue
        }
        const file = read_metadata_file(entry.file)
        if (file.download.mode) {
            hashes.set(file.download.hash, entry.file)
        }
    }
    console.log('checking ' + hashes.size + ' files')
    const versions = await fetch('https://api.modrinth.com/v2/version_files', {
        'method': 'POST',
        'headers': {
            'content-type': 'application/json'
        },
        body: JSON.stringify({
            'hashes': Array.from(hashes.keys()),
            'algorithm': 'sha1'
        })
    }).then(get_response)
    for (const hash of hashes.keys()) {
        if (hash in versions) {
            Deno.removeSync(hashes.get(hash))
            const packwiz_process = new Deno.Command('packwiz', {
                args: ['modrinth', 'add', versions[hash].files[0].url],
                stdin: 'piped'
            }).spawn()
            packwiz_process.stdin.getWriter().write(new TextEncoder().encode('n\n'))
            const status = await packwiz_process.status
            if (!status.success) {
                Deno.exit(status.code)
            }
            hashes.delete(hash)
        }
    }
}

if (args["mr-merge"]) {
    console.debug('mr-merge')
    const hashes = new Map()
    for (const entry of await get_index()) {
        if (!entry.metafile) continue
        const file = read_metadata_file(entry.file)
        if (!file.update.modrinth) {
            hashes.set(file.download.hash, entry.file)
        }
    }
    console.log('checking ' + hashes.size + ' files')
    const versions = await fetch('https://api.modrinth.com/v2/version_files', {
        'method': 'POST',
        'headers': {
            'content-type': 'application/json'
        },
        body: JSON.stringify({
            'hashes': Array.from(hashes.keys()),
            'algorithm': 'sha1'
        })
    }).then(get_response)
    for (const hash of hashes.keys()) {
        if (hash in versions) {
            const path = hashes.get(hash)
            const metadata = read_metadata_file(path)
            console.log('adding modrinth metadata for ' + metadata.name)
            metadata.update.modrinth = {
                "mod-id": versions[hash]['project_id'],
                "version": versions[hash]['id']
            }
            metadata.download.url = versions[hash]['files'][0]['url']
            delete metadata.download.mode
            const project = await fetch('https://api.modrinth.com/v2/project/' + versions[hash]['project_id']).then(get_response)
            if (project.server_side === 'unsupported') {
                metadata.side = 'client'
            } else if (project.client_side === 'unsupported') {
                metadata.side = 'server'
            }
            write_metadata_file(path, metadata)
        }
    }
}

get_index()