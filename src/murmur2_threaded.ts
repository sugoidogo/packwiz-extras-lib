import Worker from 'web-worker'
import isNode from './isNode.ts'

function onMessage(event:MessageEvent) {
    const { resolve, reject } = promises.get(event.data.id)!
    if (event.data.error) {
        reject(event.data.error)
    } else {
        resolve(event.data.hash)
    }
    promises.delete(event.data.id)
}

let workerCount = 1
if (isNode) {
    workerCount=require('node:os').cpus().length
} else {
    workerCount=navigator.hardwareConcurrency
}
const workers:Worker[] = []
for (let i = 0; i < workerCount; i++){
    const worker = new Worker(new URL('murmur2_worker.js', import.meta.url), { type: 'module' })
    worker.addEventListener('message', onMessage)
    workers.push(worker)
}

let job_id=0
let promises = new Map < number, { resolve: (value: number) => void, reject: (value: unknown) => void }>()

export default async function murmur2(key: Uint8Array, seed: number, removeWhitespaces: boolean): Promise<number> {
    return new Promise<number>(function (resolve, reject) {
        promises.set(job_id, { resolve, reject })
        workers[job_id % workerCount].postMessage({ id: job_id, key, seed, removeWhitespaces })
        job_id++
    })
}