import { spawnSync } from "node:child_process"

const deno_targets = [
    'x86_64-apple-darwin',
    'aarch64-apple-darwin',
    'x86_64-pc-windows-msvc',
    'x86_64-unknown-linux-gnu',
    'aarch64-unknown-linux-gnu'
]
for (const target of deno_targets) {
    spawnSync('deno', [
        'compile', '-P', '--target', target,
        '--output', 'dist/deno/packwiz-util-' + target,
        '--no-check', 'main.ts'
    ], { stdio: 'inherit' })
}
const bun_targets = [
    'bun-linux-x64-baseline',
    'bun-linux-arm64',
    'bun-linux-x64-musl-baseline',
    'bun-linux-arm64-musl',
    'bun-windows-x64-baseline',
    'bun-darwin-x64-baseline',
    'bun-darwin-arm64'
]
for (const target of bun_targets) {
    spawnSync('bun', [
        'build', '--compile',
        '--target', target,
        '--outfile', 'dist/bun/packwiz-util-' + target,
        'main.ts'
    ], { stdio: 'inherit' })
}