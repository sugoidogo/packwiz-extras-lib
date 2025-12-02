import fs from 'node:fs'

export default async function download(url: string, path: string) {
    if (fs.existsSync(path)) {
        return console.log(path + ' already downloaded')
    }
    console.log('downloading ' + url + ' to ' + path)
    const response = await fetch(url)
    if (!response.ok) {
        console.error(response.statusText)
        process.exit(1)
    }
    const reader = response.body?.getReader()
    const writeStream = fs.createWriteStream(path, 'binary')
    const totalSize = Number(response.headers.get('content-length'))
    let receivedSize = 0
    let chunk = await reader!.read()
    let lastProgress = 0
    while (!chunk.done) {
        writeStream.write(chunk.value)
        receivedSize += chunk.value!.length
        const progress = Math.floor((receivedSize / totalSize) * 100)
        if (process.stdout.isTTY) process.stdout.write(progress + '%\r')
        else if (progress !== lastProgress) {
            process.stdout.write('.')
            lastProgress = progress
        }
        chunk = await reader!.read()
    }
    process.stdout.write('\n')
    writeStream.close()
}