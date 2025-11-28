import murmurHash from 'murmur2'
import {parseTOML, stringifyTOML} from 'confbox'

async function fetch_toml(url: string) {
    const response = await fetch_ok(url)
    const text = await response.text()
    return parseTOML(text)
}

async function fetch_ok(url: string) {
    const response = await fetch(url)
    if (!response.ok) {
        throw new Error(`${url}: ${response.statusText}`, { 'cause': response })
    }
    return response    
}

function dirname(path: string) {
    const path_segments = path.split('/')
    path_segments.pop()
    path = path_segments.join('/')
    if (!path.startsWith('http') || !path.startsWith('./')) path = './' + path
    return path
}

async function cfDetect(pack_url: string, cfApiKey: string) {
    const pack = await fetch_toml(pack_url) as Pack
    const pack_dir = dirname(pack_url)
    const index_url=`${pack_dir}/${pack.index.file}`
    const index = await fetch_toml(index_url) as Index
    const index_dir = dirname(index_url)
    if (!index.files) return console.warn(`${index_url} has no files indexed`)
    const file_hash_map = new Map<number,string>()
    for (const file of index.files) {
        if (file.metafile) continue
        const file_url=`${index_dir}/${file.file}`
        const response = await fetch_ok(file.file)
        const data = await response.bytes()
        const hash = murmurHash(data, 1, true)
        file_hash_map.set(hash,file_url)
    }
    // TODO
}