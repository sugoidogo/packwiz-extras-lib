const targets = [
    'x86_64-apple-darwin',
    'aarch64-apple-darwin',
    'x86_64-pc-windows-msvc',
    'x86_64-unknown-linux-gnu',
    'aarch64-unknown-linux-gnu'
]
for (const target of targets) {
    const status = await new Deno.Command('deno', { args: ['check', 'main.ts'] }).spawn().status
    if (!status.success) {
        Deno.exit(status.code)
    }
    new Deno.Command('deno', {
        args: [
            'compile', '-P', '--target', target,
            '--output', 'dist/packwiz-util-' + target,
            '--no-check','main.ts']
    }).spawn().ref()
}