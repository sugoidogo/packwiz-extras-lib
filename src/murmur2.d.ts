declare module "murmur2" {
    export default function murmurHash(key: Uint8Array, seed: number, removeWhitespaces: boolean): number
}