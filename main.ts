import murmurHash from 'murmur2'
import * as TOML from '@std/toml'
import * as Path from '@std/path'
import dotenv from 'dotenv'
import { parseArgs } from '@std/cli'
import { crypto } from '@std/crypto'
import { encodeHex } from "@std/encoding/hex"
import { spawnSync } from 'node:child_process'
import { Utf8Stream } from 'node:fs'
import fs from 'node:fs/promises'

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
    return fs.readFile(args.index, 'utf-8').then(function (data) {
        return TOML.parse(data).files as indexEntry[]
    })
}

function refresh_index() {
    const status = spawnSync('packwiz', ['refresh'], { stdio: 'inherit' }).status
    if (status !== 0) {
        process.exit(status)
    }
}

async function read_metadata_file(path: string) {
    return fs.readFile(path, 'utf-8').then(function (data) {
        return TOML.parse(data) as metaData
    })
    //return TOML.parse(fs.readFileSync(path, 'utf-8')) as metaData
}

async function write_metadata_file(path: string, metadata: metaData) {
    return fs.writeFile(path,TOML.stringify(metadata),'utf-8')
}

let jobs: Promise<void>[] = []

async function allJobs() {
    return Promise.all(jobs).then(function () {jobs=[]})
}

if (args["cf-detect"]) {
    console.log('cf-detect')
    const cfKey = get_key()
    const fingerprints = new Map()
    console.log('hashing files, this may take a while...')
    for (const entry of await get_index()) {
        if (entry.metafile) continue
        jobs.push(fs.readFile(entry.file).then(function (data) {
            if (data.length === 0) return
            fingerprints.set(murmurHash(data,1,true),entry.file)
        }))
    }
    await allJobs()
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
        jobs.push(fs.unlink(path).then(function () {
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
        }))
    }
    await allJobs()
    refresh_index()
}

if (args["cf-url"]) {
    console.log(`cf-url`)
    const cfKey = get_key()
    const cfFiles = new Map()
    console.log('gathering curseforge files...')
    for (const entry of await get_index()) {
        if (!entry.metafile) continue
        jobs.push(read_metadata_file(entry.file).then(function (metadata) {
            if (metadata.download.url || !metadata.update.curseforge) return
            cfFiles.set(metadata.update.curseforge['file-id'],{metadata,path:entry.file})
        }))
    }
    await allJobs()
    const fileIds=Array.from(cfFiles.keys())
    console.log('requesting file info for ' + fileIds.length + ' files')
    const files = await fetch('https://api.curseforge.com/v1/mods/files', {
        'method': 'POST',
        'headers': {
            'content-type': 'application/json',
            'accept': 'application/json',
            'x-api-key':cfKey
        },
        body:JSON.stringify({fileIds})
    }).then(get_response)
    for (const file of files.data) {
        if (!file.downloadUrl) {
            console.error('third party downloads not allowed for ' + file.displayName)
            continue
        }
        const { path, metadata } = cfFiles.get(file.id)
        delete metadata.download.mode
        metadata.download.url = file.downloadUrl
        jobs.push(write_metadata_file(path,metadata))
    }
    console.log('caching download urls for '+jobs.length+' files')
    await allJobs()
    refresh_index()
}

if (args["mr-detect"]) {
    console.debug('mr-detect')
    const hashes = new Map()
    for (const entry of await get_index()) {
        if (entry.metafile) continue
        jobs.push(fs.readFile(entry.file).then(function (data) {
            if (data.length === 0) return
            hashes.set(encodeHex(crypto.subtle.digestSync('SHA-1', data)),entry.file)
        }))
    }
    await allJobs()
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
            jobs.push(fs.unlink(hashes.get(hash)).then(function () {
                const status = spawnSync('packwiz',
                    ['modrinth', 'add', versions[hash].files[0].url],
                    { stdio: 'inherit', input: 'n\n' }
                ).status
                if (status !== 0) {
                    process.exit(status)
                }
            }))
        }
    }
    await allJobs()
    refresh_index()
}

if (args["mr-merge"]) {
    console.debug('mr-merge')
    const hashes = new Map()
    for (const entry of await get_index()) {
        if (!entry.metafile) continue
        jobs.push(read_metadata_file(entry.file).then(function (metadata) {
            if (!metadata.update.modrinth) {
                hashes.set(metadata.download.hash, {metadata,path:entry.file})
            }
        }))
    }
    await allJobs()
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
    const foundFiles=new Map()
    for (const hash of hashes.keys()) {
        if (hash in versions) {
            const {path, metadata} = hashes.get(hash)
            metadata.update.modrinth = {
                "mod-id": versions[hash]['project_id'],
                "version": versions[hash]['id']
            }
            metadata.download.url = versions[hash]['files'][0]['url']
            delete metadata.download.mode
            foundFiles.set(versions[hash]['project_id'],{path,metadata})
        }
    }
    const url = new URL('https://api.modrinth.com/v2/projects')
    const ids='["'+Array.from(foundFiles.keys()).join('","')+'"]'
    url.searchParams.append('ids',ids)
    const projects = await fetch(url).then(get_response)
    for (const project of projects) {
        const { path, metadata } = foundFiles.get(project.id)
        if (project.server_side === 'unsupported') {
            metadata.side = 'client'
        } else if (project.client_side === 'unsupported') {
            metadata.side = 'server'
        }
        jobs.push(write_metadata_file(path, metadata))
    }
    console.log('adding modrinth metadata to '+jobs.length+' files')
    await allJobs()
    refresh_index()
}