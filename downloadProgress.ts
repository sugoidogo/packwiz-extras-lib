import fs from 'node:fs'

export default async function download(url: string, path: string) {
    const response = await fetch(url)
    if (!response.ok) {
            console.error(response.statusText)
            process.exit(1)
        }
        const reader = response.body?.getReader()
        const writeStream = fs.createWriteStream(path, { encoding: 'binary' })
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