import { spawnSync } from "node:child_process"

const deno = false // works, but produces largest executables
const bun = true // smallest working executables, but build failing on windows
const pkg = false // smallest executables but don't work

if (deno) {
    spawnSync('deno', ['install'], { stdio: 'inherit', shell: true })
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
        ], { stdio: 'inherit', shell: true })
    }
}

if (bun) {
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
        ], { stdio: 'inherit', shell: true })
    }
}

if (pkg) {
    const pkg_targets = [
        'latest-linux-x64',
        'latest-linux-arm64',
        'latest-windows-x64',
        'latest-macos-x64',
        'latest-macos-arm64'
    ]
    spawnSync('pkg', [
        '--targets', pkg_targets.join(','),
        '--output', 'dist/pkg/packwiz-util',
        '--no-bytecode', '--public', // doesn't build without these
        //'--sea', // doesn't build with this
        '--compress', 'GZip',
        //'--compress', 'Brotli', // same size as GZip and the internet says GZip is better
        'main.ts'
    ], { stdio: 'inherit', shell: true })
}