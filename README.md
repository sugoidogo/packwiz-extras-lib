# Packwiz-Util

This is a small helper program to implement some missing features from
[packwiz](https://github.com/packwiz/packwiz)

# Usage

```
packwiz-util: extra utilities for packwiz

--pack-file=pack.toml   the modpack metadata file to use (default "pack.toml")

--cf-api-key='YOUR_API_KEY'     your curseforge API key, required for all --cf functions. Can also be provided via CF_API_KEY environment variable or .env file
--cf-detect                     detect and replace any non-metafiles that are availible on curseforge
--cf-url                        cache the download URLs of curseforge files, speeds up packwiz-installer

--mr-detect     detect and replace any non-metafiles that are availible on modrinth
--mr-merge      detect any curseforge files that are availible on modrinth and merge their metadata

--test-server   use docker to test the installation and startup of your modpack. Once startup is complete, use the stop command to exit.
```