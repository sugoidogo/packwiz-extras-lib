import murmurHash from 'murmur2'
import * as TOML from '@std/toml'
import * as Path from '@std/path'
import dotenv from 'dotenv'
import { parseArgs } from '@std/cli'
import { crypto } from '@std/crypto'
import { encodeHex } from "@std/encoding/hex"
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'

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

dotenv.config
const args = parseArgs(process.argv, {
    string: ['index', 'cf-api-key'],
    boolean: ['cf-detect', 'cf-url', 'mr-detect', 'mr-merge'],
    default: { 'index': 'index.toml', 'cf-api-key': process.env['CF_API_KEY'] }
})

if (!(args["cf-detect"] || args["cf-url"] || args["mr-detect"] || args["mr-merge"])) {
    console.log("usage: packwiz-util [--index=index.toml] [--cf-api-key='CF_API_KEY'] [--cf-detect] [--cf-url] [--mr-detect] [--mr-merge]")
    process.exit()
}

function get_response(response: Response) {
    if (!response.ok) {
        console.error(response.statusText)
        process.exit(1)
    }
    return response.json()
}

function get_key() {
    const cfKey = args["cf-api-key"]
    if (!cfKey) {
        console.error('--cf-api-key or CF_API_KEY required')
        process.exit(1)
    }
    return cfKey
}

async function get_index() {
    const status = spawnSync('packwiz', ['refresh'], { stdio: 'inherit' }).status
    //const status = await new Deno.Command('packwiz', { args: ['refresh'] }).spawn().status
    if (status !== 0) {
        process.exit(status)
    }
    return TOML.parse(fs.readFileSync('index.toml', 'utf-8')).files as indexEntry[]
}

function read_metadata_file(path: string) {
    return TOML.parse(fs.readFileSync(path, 'utf-8')) as metaData
}

function write_metadata_file(path: string, metadata: metaData) {
    return fs.writeFileSync(path, TOML.stringify(metadata), { encoding: 'utf-8' })
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
        const hash = murmurHash(fs.readFileSync(entry.file), 1, true)
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
        if (!path) continue
        fs.unlinkSync(path)
        const status = spawnSync('packwiz',
            ['curseforge', 'add',
                '--addon-id', match.file.modId,
                '--file-id', match.file.id,
                '--meta-folder', Path.dirname(path)],
            { stdio: 'inherit' }
        ).status
        if (status !== 0) {
            process.exit(status)
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
        const response = await fetch(`https://api.curseforge.com/v1/mods/${metadata.update.curseforge['project-id']}/files/${metadata.update.curseforge['file-id']}/download-url`, {
            'headers': {
                'accept': 'application/json',
                'x-api-key': cfKey
            }
        })
        if (response.status === 403) {
            console.error('third party downloads not allowed for ' + metadata.name)
            continue
        }
        const json = await get_response(response)
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
        if (entry.metafile) continue
        const file = fs.readFileSync(entry.file)
        const hash = encodeHex(crypto.subtle.digestSync('SHA-1', file))
        hashes.set(hash, entry.file)
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
            fs.unlinkSync(hashes.get(hash))
            const status = spawnSync('packwiz',
                ['modrinth', 'add', versions[hash].files[0].url],
                { stdio: 'inherit', input: 'n\n' }
            ).status
            if (status !== 0) {
                process.exit(status)
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