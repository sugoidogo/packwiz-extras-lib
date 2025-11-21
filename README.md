# Packwiz-Util

This is a small helper program to implement some missing features from
[packwiz](https://github.com/packwiz/packwiz)

# Usage

```
packwiz-util [--index=index.toml] [--cf-api-key='CF_API_KEY'] [--cf-detect] [--cf-url] [--mr-detect] [--mr-merge] [--test-server]
```

- `--index` path to the packwiz pack's `index.toml` file, defaults to `index.toml` in the working directory
- `--cf-api-key` required for all `--cf` operations, can also be provided via `CF_API_KEY` environment variable or `.env` file. You can find your API key on the [curseforge console](https://console.curseforge.com/?#/api-keys)
- `--cf-detect` checks all non-metafiles in the modpack for availibility on curseforge and replaces them
- `--cf-url` cache the direct download url of each curseforge file into the modpack, speeds up `packwiz-installer`
- `--mr-detect` checks all non-metafiles in the modpack for availibility on modrinth and replaces them
- `--mr-merge` checks all curseforge files for availibility on modrinth and merges the metadata
- `--test-server` starts a docker container to test the server side of the modpack