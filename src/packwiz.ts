import murmurHash from './murmur2_threaded.ts'
import sha1 from './sha1.ts'
import isNode from './isNode.ts'
import { parseTOML } from 'confbox'

async function fetch_toml(url: string, options?: RequestInit) {
    const response = await fetch_ok(url, options)
    const text = await response.text()
    return parseTOML(text)
}

async function fetch_json(url: string, options?: RequestInit) {
    const response = await fetch_ok(url, options)
    const json = await response.json()
    return json
}

async function fetch_bytes(url: string, options?: RequestInit) {
    const response = await fetch_ok(url, options)
    const bytes = await response.bytes()
    return bytes
}

async function fetch_ok(url: string, options?: RequestInit) {
    if (isNode && !url.startsWith('http')) {
        return require('node:fs/promises')
            .readFile(url)
            .then((body:any)=>new Response(body)) as Response
    }
    const response = await fetch(url, options)
    if (!response.ok) {
        throw new Error(`${url}: ${response.statusText}`, { 'cause': response })
    }
    return response
}

function dirname(path: string) {
    if (!path.startsWith('http') && !path.startsWith('./')) path = './' + path
    const path_segments = path.split('/')
    path_segments.pop()
    path = path_segments.join('/')
    return path
}

export async function cfDetect(pack_url: string, cfApiKey: string, size_min=4096): Promise<Map<Path, Mod>> {
    console.log('loading pack')
    const pack = await fetch_toml(pack_url) as Pack
    const pack_dir = dirname(pack_url)
    const index_url = `${pack_dir}/${pack.index.file}`
    console.log('loading index')
    const index = await fetch_toml(index_url) as Index
    const index_dir = dirname(index_url)
    if (!index.files) {
        console.warn(`${index_url} has no files indexed`)
        return new Map()
    }
    const file_hash_map = new Map<number, Path>()
    console.log('hashing files')
    await Promise.all(index.files.map(async file => {
        if (file.metafile) return
        const file_url = `${index_dir}/${file.file}`
        const file_data = await fetch_bytes(file_url)
        if (file_data.length < size_min) return
        const hash=await murmurHash(file_data,1,true)
        file_hash_map.set(hash, file_url)
    }))
    console.log('requesting matches from curseforge')
    const response = await fetch_json('https://api.curseforge.com/v1/fingerprints', {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            'accept': 'application/json',
            'x-api-key': cfApiKey
        },
        body: JSON.stringify({ fingerprints: Array.from(file_hash_map.keys()) })
    })
    const result = new Map<Path, Mod>()
    for (const match of response.data.exactMatches) {
        let file_url = file_hash_map.get(match.file.fileFingerprint)
        if (!file_url) {
            for (const module of match.file.modules) {
                file_url = file_hash_map.get(module.fingerprint)
            }
            if (file_url) {
                console.debug("skipping module match, this is probably a false positive", file_url, match.file)
            } else {
                console.debug("curseforge returned a result we didn't ask for, skipping", match.file)
            }
            continue
        }
        for (const hash of match.file.hashes) {
            if (hash.algo === 1) {
                const mod: Mod = {
                    "name": match.file.displayName,
                    "filename": match.file.fileName,
                    "download": {
                        "hash-format": "sha1",
                        "hash": hash.value,
                        "mode": "metadata:curseforge"
                    },
                    "update": {
                        "curseforge": {
                            "file-id": match.file.id,
                            "project-id": match.file.modId
                        }
                    }
                }
                result.set(file_url, mod)
                break
            }
        }
    }
    console.log(`found ${result.size} matching files`)
    return result
}

export async function mrDetect(pack_url: string, size_min=4096): Promise<Map<Path, Mod>> {
    console.log('loading pack')
    const pack = await fetch_toml(pack_url) as Pack
    const pack_dir = dirname(pack_url)
    const index_url = `${pack_dir}/${pack.index.file}`
    console.log('loading index')
    const index = await fetch_toml(index_url) as Index
    const index_dir = dirname(index_url)
    if (!index.files) {
        console.warn(`${index_url} has no files indexed`)
        return new Map()
    }
    const file_hash_map = new Map<Hash, Path>()
    console.log('hashing files')
    await Promise.all(index.files.map(async file => {
        if (file.metafile) return
        const file_url = `${index_dir}/${file.file}`
        const file_data = await fetch_bytes(file_url)
        if (file_data.length < size_min) return
        const hash=await sha1(file_data)
        file_hash_map.set(hash, file_url)
    }))
    console.log('requesting matches from modrinth')
    const matches = await fetch_json('https://api.modrinth.com/v2/version_files', {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            'accept': 'application/json'
        },
        body: JSON.stringify({
            "algorithm": "sha1",
            "hashes": Array.from(file_hash_map.keys())
        })
    })
    const project_matches = new Map<string, any>()
    for (const match of Object.values(matches) as any[]) project_matches.set(match.project_id, match)
    const projects = await fetch_json(`https://api.modrinth.com/v2/projects?ids=["${Array.from(project_matches.keys()).join('","')}"]`)
        
    const result = new Map<Path, Mod>()
    for (const project of projects) {
        const match = project_matches.get(project.id)
        if (!match) {
            console.debug("modrinth returned a project result we didn't ask for, skipping", project)
            continue
        }
        const file_url = file_hash_map.get(match.files[0].hashes.sha1)
        if (!file_url) {
            console.debug("modrinth returned a file result we didn't ask for, skipping", match)
            continue
        }
        let side: Side = "both"
        if (project.client_side === "unsupported") side = "server"
        if (project.server_side === "unsupported") side = "client"
        const mod: Mod = {
            "name": project.title,
            "filename": match.files[0].filename,
            "side": side,
            "download": {
                "hash-format": "sha1",
                "hash": match.files[0].hashes.sha1,
                "url": match.files[0].url
            },
            "update": {
                "curseforge": {
                    "file-id": match.id,
                    "project-id": match.project_id
                }
            }
        }
        result.set(file_url, mod)
    }
    console.log(`found ${result.size} matching files`)
    return result
}

export async function cfUrl(pack_url: string, cfApiKey: string): Promise<Map<Path,Mod>> {
    console.log('loading pack')
    const pack = await fetch_toml(pack_url) as Pack
    const pack_dir = dirname(pack_url)
    const index_url = `${pack_dir}/${pack.index.file}`
    console.log('loading index')
    const index = await fetch_toml(index_url) as Index
    const index_dir = dirname(index_url)
    if (!index.files) {
        console.warn(`${index_url} has no files indexed`)
        return new Map()
    }
    const mod_paths = new Map<number, { mod: Mod, file_url: Path }>()
    console.log('loading curseforge files')
    await Promise.all(index.files.map(async file => {
        if(!file.metafile) return
        const file_url = `${index_dir}/${file.file}`
        const mod = await fetch_toml(file_url) as Mod
        if (!mod.update || !mod.update.curseforge) {
            return
        }
        mod_paths.set(mod.update.curseforge['file-id'],{mod,file_url})
    }))
    console.log(`requesting ${mod_paths.size} download urls`)
    const response = await fetch_json('https://api.curseforge.com/v1/mods/files', {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            'accept': 'application/json',
            'x-api-key': cfApiKey
        },
        body: JSON.stringify({'fileIds':Array.from(mod_paths.keys())})
    })
    const result = new Map<Path, Mod>()
    for (const file of response.data) {
        if (!file.downloadUrl) {
            console.warn('third party downloads disabled for ' + file.displayName)
            continue
        }
        const { mod, file_url } = mod_paths.get(file.id)!
        delete mod.download.mode
        mod.download.url = file.downloadUrl
        result.set(file_url,mod)
    }
    console.log(`found ${result.size} download urls`)
    return result
}