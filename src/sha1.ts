// copied from https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API/Non-cryptographic_uses_of_subtle_crypto#hashing_a_file
export default async function sha1(arrayBuffer: BufferSource) {
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