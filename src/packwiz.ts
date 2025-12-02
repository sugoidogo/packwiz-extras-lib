/**
 * The hash algorithm used to determine if a file is valid.
 * All functions listed must be supported by tools implementing the packwiz pack format.
 */
export type HashFormat = "sha256" | "sha512" | "sha1" | "md5" | "murmur2"
/**
 * A relative path using forward slashes.
 * Must not reference a file outside the pack root,
 * and should not include characters or filenames restricted on common operating systems.
 * 
 * Implementations must support special characters including those that are percent-encoded in URLs,
 * such as spaces and square brackets.
 * Implementations must guard against path traversal attacks and manually validate paths.
 */
export type Path = string
/**
 * Binary hashes should be stored as hexadecimal,
 * and case should be ignored during parsing.
 * Numeric hashes (e.g. Murmur2) should still be stored as a string,
 * to ensure the value is preserved correctly.
 */
export type Hash = string
/**
 * A physical Minecraft side.
 * Server applies to the dedicated server,
 * client applies to the client (and integrated server),
 * and both applies to every installation.
 */
export type Side = "both" | "client" | "server"
/**
 * An absolute URI compliant with RFC 3986.
 * Implementations may need to be more lenient in accepting reserved characters in paths
 * due to historical implementation bugs.
 * Only the HTTP/HTTPS protocols must be supported,
 * other protocols should not be used.
 */
export type Url = string
/**
 * The main modpack file for a packwiz modpack.
 * This is the first file loaded,
 * to allow the modpack downloader to download all the files in the modpack.
 */
export interface Pack {
    /**
     * The name of the modpack.
     * This can be displayed in user interfaces to identify the pack,
     * and it does not need to be unique between packs.
     */
    "name": string
    /**
     * The author(s) of the modpack.
     * This is output when exporting to the CurseForge pack format,
     * and can be displayed in user interfaces.
     */
    "author"?: string
    /**
     * The version of the modpack.
     * This is output when exporting to the CurseForge pack format,
     * but is not currently used elsewhere by the tools or installer.
     * It must not be used for determining if the modpack is outdated.
     */
    "version"?: string
    /**
     * A short description of the modpack.
     * This is output when exporting to the Modrinth pack format,
     * but is not currently used elsewhere by the tools or installer.
     */
    "description"?: string
    /**
     * A version string identifying the pack format and version of it.
     * Currently, this pack format uses version 1.1.0.
     * 
     * If it is not defined, default to "packwiz:1.0.0" 
     * for backwards-compatibility with packs created before this field was added.
     * 
     * If it is defined:
     * 
     * - All consumers should fail to load the modpack if it does not begin with "packwiz:"
     * 
     * - All consumers should fail to load the modpack if the latter section is not valid semver
     * as defined in https://semver.org/spec/v2.0.0.html
     * 
     * - All consumers should fail to load the modpack if the major version is greater than the version they support
     * 
     * - Consumers can suggest updating themselves if the minor version is greater than the version they implement
     * 
     * - Pack tools should suggest and support migration when they support a version newer than this field
     */
    "pack-format": string
    /** Information about the index file in this modpack. */
    "index": {
        /** The path to the file that contains the index. @see {@link Path} */
        "file": Path
        /** The hash format for the hash of the index file. @see {@link HashFormat} */
        "hash-format": HashFormat
        /** The hash of the index file, as a string. @see {@link Hash} */
        "hash": Hash
    }
    /**
     * The versions of components used by this modpack - usually Minecraft and the mod loader this pack uses.
     * The existence of a component implies that it should be installed.
     * These values can also be used by tools to determine which versions of mods should be installed.
     */
    "versions": {
        /**
         * The version of Minecraft used by this modpack.
         * This should be in the format used by the version.json files.
         */
        "minecraft": string
        /**
         * The version of Forge used by this modpack.
         * This version must not include the Minecraft version as a prefix.
         */
        "forge"?: string
        /** The version of Fabric loader used by this modpack. */
        "fabric"?: string
        /** The version of Quilt loader used by this modpack. */
        "quilt"?: string
        /** The version of Liteloader used by this modpack. */
        "liteloader"?: string
        "neoforge"?: string
    },
    /** Additional options */
    "options"?: {
        /**
         * A list of additional Minecraft versions to accept when installing or updating mods.
         * @see https://packwiz.infra.link/tutorials/creating/adding-mods/
         */
        "acceptable-game-versions"?: string[]
        /**
         * The folder in which new metadata files will be added,
         * defaulting to a folder based on the category
         * (mods, resourcepacks, etc; if the category is unknown the current directory is used)
         */
        "meta-folder"?: string
        /** deprecated; aliassed to meta-folder */
        "mods-folder"?: string
        /**
         * The base folder from which meta-folder will be resolved,
         * defaulting to the current directory
         * (so you can put all mods/etc in a subfolder while still using the default behaviour)
         */
        "meta-folder-base"?: string
        /**
         * If this is set to true,
         * packwiz will not generate hashes of local files,
         * to prevent merge conflicts and inconsistent hashes when using git/etc.
         * 
         * - `packwiz refresh --build` can be used in this mode to generate internal hashes
         * for distributing the pack with packwiz-installer
         */
        "no-internal-hashes"?: boolean
        /**
         * The folder in which datapacks are to be added;
         * specific to the datapack loader mod you use,
         * and must be set to add datapacks
         * (that are not bundled as mods)
         */
        "datapack-folder"?: string
    }
}
/**
 * The index file of the modpack,
 * storing references to every file to be downloaded in the pack.
 */
export interface Index {
    /** The default hash format for every file in the index. @see {@link HashFormat} */
    "hash-format": HashFormat
    /**
     * The files listed in this index.
     * If it is not defined, defaults to an empty list.
     */
    "files"?: [{
        /**
         * The path to the file to be downloaded,
         * relative to this index file.
         * @see {@link Path}
         */
        "file": Path
        /** The hash of the specified file, as a string. @see {@link Hash} */
        "hash": Hash
        /**
         * The name with which this file should be downloaded,
         * instead of the filename specified in the path.
         * Not compatible with metafile,
         * and may not be very well supported.
         */
        "alias"?: string
        /**
         * The hash format for the hash of the specified file.
         * Defaults to the hash format specified in the index -
         * ideally remove this value if it is equal to the hash format for the index to save space.
         * @see {@link HashFormat}
         */
        "hash-format"?: HashFormat
        /**
         * True when this entry points to a .toml metadata file,
         * which references a file outside the pack.
         */
        "metafile"?: boolean
        /**
         * When this is set to true,
         * the file is not overwritten if it already exists,
         * to preserve changes made by a user.
         */
        "preserve"?: boolean
    }]
}
/**
 * A metadata file which references an external file from a URL.
 * This allows for side-only mods,
 * optional mods and stores metadata to allow finding updates from Modrinth and CurseForge.
 * The "mod" terminology is used a lot here,
 * but this should work for any file.
 */
export interface Mod {
    /**
     * The destination path of the mod file,
     * relative to this file.
     * @see {@link Path}
     */
    "filename": Path
    /**
     * The name of the mod,
     * which can be displayed in user interfaces to identify the mod.
     * It does not need to be unique between mods,
     * although this may cause confusion.
     */
    "name": string
    /** The side on which this mod should be installed. @see {@link Side} */
    "side"?: Side
    /** Information about how to download this mod. */
    "download": {
        /** The hash format for the hash of the specified file. @see {@link HashFormat} */
        "hash-format": HashFormat
        /** The hash of the specified file, as a string. @see {@link Hash} */
        "hash": Hash
        /** The URL to download the mod from. @see {@link URL} */
        "url"?: Url
        "mode"?: string
    }
    /**
     * Information about the optional state of this mod.
     * When excluded, this indicates that the mod is not optional.
     */
    "option"?: {
        /**
         * Whether or not the mod is optional.
         * This can be set to false if you want to keep the description but make the mod required.
         */
        "optional": boolean
        /**
         * If true, the mod will be enabled by default.
         * If false, the mod will be disabled by default.
         * If a pack format does not support optional mods but it does support disabling mods,
         * the mod will be disabled if it defaults to being disabled.
         */
        "default"?: boolean
        /**
         * A description displayed to the user when they select optional mods.
         * This should explain why or why not the user should enable the mod.
         */
        "description"?: string
    }
    /**
     * Information about how to update the download details of this mod with tools.
     * 
     * If this object does not exist or there are no defined update sources,
     * the mod will not be automatically updated.
     * 
     * If there are multiple defined update sources,
     * one of them will be chosen.
     * The source that is chosen is not defined,
     * so it is therefore dependent on the implementation of the tool
     * (may not be deterministic, so do not rely on one source being chosen over another).
     */
    "update"?: {
        /** An update source for updating mods downloaded from CurseForge. */
        "curseforge"?: {
            /**
             * An integer representing the unique file ID of this mod file.
             * This can be used if more metadata needs to be obtained relating to the mod.
             */
            "file-id": number
            /**
             * An integer representing the unique project ID of this mod.
             * Updating will retrieve the latest file for this project ID that is valid
             * (correct Minecraft version, release channel, modloader, etc.).
             */
            "project-id": number
        }
        /** An update source for updating mods downloaded from Modrinth. */
        "modrinth"?: {
            /**
             * A string representing the unique mod ID of this mod.
             * Updating will retrieve the latest file for this project ID that is valid
             * (correct Minecraft version, release channel, modloader, etc.).
             */
            "mod-id": string
            /**
             * A string representing the unique version ID of this file.
             * This can be used if more metadata needs to be obtained relating to the mod.
             */
            "version": string
        }
    }
}

import WorkerlessPool from 'workerless'
import { parseTOML } from 'confbox'

// copied from https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API/Non-cryptographic_uses_of_subtle_crypto#hashing_a_file
async function sha1(arrayBuffer: BufferSource) {
    const hashAsArrayBuffer = await crypto.subtle.digest("SHA-1", arrayBuffer);
    const uint8ViewOfHash = new Uint8Array(hashAsArrayBuffer);
    // @ts-ignore
    if (uint8ViewOfHash.toHex) {
        // @ts-ignore
        return uint8ViewOfHash.toHex() as string;
    }
    const hashAsString = Array.from(uint8ViewOfHash)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    return hashAsString;
}

async function fetch_toml(url: string, options?: RequestInit) {
    const response = await fetch_ok(url, options)
    const text = await response.text()
    return parseTOML(text) as any
}

async function fetch_json(url: string, options?: RequestInit) {
    const response = await fetch_ok(url, options)
    const json = await response.json()
    return json as any
}

async function fetch_bytes(url: string, options?: RequestInit) {
    const response = await fetch_ok(url, options)
    const bytes = await response.bytes()
    return bytes
}

async function fetch_ok(url: string, options?: RequestInit) {
    try {
        new URL(url)
    } catch {
        // @ts-expect-error
        const fs = await import('node:fs/promises')
        const body = await fs.readFile(url)
        return new Response(body)
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
    const workerlessPool = new WorkerlessPool()
    await Promise.all(index.files.map(async file => {
        if (file.metafile) return
        const file_url = `${index_dir}/${file.file}`
        const file_data = await fetch_bytes(file_url)
        if (file_data.length < size_min) return
        const hash = await workerlessPool.run(async function (buffer: Uint8Array) {
            const murmurHash = await import('murmur2').then(module => module.default)
            return murmurHash(buffer, 1, true)
        }, file_data)
        file_hash_map.set(hash, file_url)
    }))
    workerlessPool.terminate()
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

export async function mrDetect(pack_url: string, mrApiKey?: string, size_min = 4096): Promise<Map<Path, Mod>> {
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
            'accept': 'application/json',
            'authorization': mrApiKey
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
                "modrinth": {
                    "version": match.id,
                    "mod-id": match.project_id
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

export async function mrMerge(pack_url: string, mrApiKey?: string): Promise<Map<Path, Mod>> {
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
    console.log('loading curseforge files')
    const file_hash_map:any={}
    await Promise.all(index.files.map(async function (file) {
        if (!file.metafile) return
        const file_url = `${index_dir}/${file.file}`
        const mod = await fetch_toml(file_url) as Mod
        if (mod.update && mod.update.modrinth) return
        if (!file_hash_map[mod.download['hash-format']]) file_hash_map[mod.download['hash-format']] = {}
        file_hash_map[mod.download['hash-format']][mod.download.hash]={file_url,mod}
    }))
    console.log('requesting matches from modrinth')
    const project_matches = new Map<string, any>()
    for (const hash_format in file_hash_map) {
        const matches = await fetch_json('https://api.modrinth.com/v2/version_files', {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                'accept': 'application/json',
                'authorization': mrApiKey
            },
            body: JSON.stringify({
                "algorithm": hash_format,
                "hashes": Array.from(Object.keys(file_hash_map[hash_format]))
            })
        })
        for (const match of Object.values(matches) as any[]) project_matches.set(match.project_id, match)
    }
    const projects = await fetch_json(`https://api.modrinth.com/v2/projects?ids=["${Array.from(project_matches.keys()).join('","')}"]`)
    const result = new Map<Path, Mod>()
    for (const project of projects) {
        const match = project_matches.get(project.id)
        if (!match) {
            console.debug("modrinth returned a project result we didn't ask for, skipping", project)
            continue
        }
        let file_url: Path|undefined
        let mod: Mod|undefined
        for (const hash_format in file_hash_map) {
            ({file_url,mod}=file_hash_map[hash_format][match.files[0].hashes[hash_format].toLowerCase().replace('-','')])
        }
        if (!file_url || !mod) {
            console.debug("modrinth returned a file result we didn't ask for, skipping", match)
            continue
        }
        delete mod.download.mode
        mod.download.url = match.files[0].url
        let side: Side = "both"
        if (project.client_side === "unsupported") side = "server"
        if (project.server_side === "unsupported") side = "client"
        mod.side = side
        if (!mod.update) mod.update = {}
        mod.update.modrinth = {
            "version": match.id,
            "mod-id": match.project_id
        }
        result.set(file_url, mod)
    }
    console.log(`found ${result.size} matching files`)
    return result
}