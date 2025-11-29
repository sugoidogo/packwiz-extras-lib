import murmurHash from "murmur2";

addEventListener('message', event => {
    try {
        postMessage({
            id: event.data.id,
            hash: murmurHash(event.data.key, event.data.seed, event.data.removeWhitespaces)
        })
    } catch (error) {
        postMessage({
            id: event.data.id,
            error
        })
    }
})