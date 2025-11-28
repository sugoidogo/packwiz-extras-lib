/**
 * The hash algorithm used to determine if a file is valid.
 * All functions listed must be supported by tools implementing the packwiz pack format.
 */
type HashFormat = "sha256" | "sha512" | "sha1" | "md5" | "murmur2"
/**
 * A relative path using forward slashes.
 * Must not reference a file outside the pack root,
 * and should not include characters or filenames restricted on common operating systems.
 * 
 * Implementations must support special characters including those that are percent-encoded in URLs,
 * such as spaces and square brackets.
 * Implementations must guard against path traversal attacks and manually validate paths.
 */
type Path = string
/**
 * Binary hashes should be stored as hexadecimal,
 * and case should be ignored during parsing.
 * Numeric hashes (e.g. Murmur2) should still be stored as a string,
 * to ensure the value is preserved correctly.
 */
type Hash = string
/**
 * A physical Minecraft side.
 * Server applies to the dedicated server,
 * client applies to the client (and integrated server),
 * and both applies to every installation.
 */
type Side = "both" | "client" | "server"
/**
 * An absolute URI compliant with RFC 3986.
 * Implementations may need to be more lenient in accepting reserved characters in paths
 * due to historical implementation bugs.
 * Only the HTTP/HTTPS protocols must be supported,
 * other protocols should not be used.
 */
type Url = string
/**
 * The main modpack file for a packwiz modpack.
 * This is the first file loaded,
 * to allow the modpack downloader to download all the files in the modpack.
 */
interface Pack {
    /**
     * The name of the modpack.
     * This can be displayed in user interfaces to identify the pack,
     * and it does not need to be unique between packs.
     */
    "name": string
    /**
     * The author(s) of the modpack.
     * This is output when exporting to the CurseForge pack format,
     * and can be displayed in user interfaces.
     */
    "author"?: string
    /**
     * The version of the modpack.
     * This is output when exporting to the CurseForge pack format,
     * but is not currently used elsewhere by the tools or installer.
     * It must not be used for determining if the modpack is outdated.
     */
    "version"?: string
    /**
     * A short description of the modpack.
     * This is output when exporting to the Modrinth pack format,
     * but is not currently used elsewhere by the tools or installer.
     */
    "description"?: string
    /**
     * A version string identifying the pack format and version of it.
     * Currently, this pack format uses version 1.1.0.
     * 
     * If it is not defined, default to "packwiz:1.0.0" 
     * for backwards-compatibility with packs created before this field was added.
     * 
     * If it is defined:
     * 
     * - All consumers should fail to load the modpack if it does not begin with "packwiz:"
     * 
     * - All consumers should fail to load the modpack if the latter section is not valid semver
     * as defined in https://semver.org/spec/v2.0.0.html
     * 
     * - All consumers should fail to load the modpack if the major version is greater than the version they support
     * 
     * - Consumers can suggest updating themselves if the minor version is greater than the version they implement
     * 
     * - Pack tools should suggest and support migration when they support a version newer than this field
     */
    "pack-format": string
    /** Information about the index file in this modpack. */
    "index": {
        /** The path to the file that contains the index. @see {@link Path} */
        "file": Path
        /** The hash format for the hash of the index file. @see {@link HashFormat} */
        "hash-format": HashFormat
        /** The hash of the index file, as a string. @see {@link Hash} */
        "hash": Hash
    }
    /**
     * The versions of components used by this modpack - usually Minecraft and the mod loader this pack uses.
     * The existence of a component implies that it should be installed.
     * These values can also be used by tools to determine which versions of mods should be installed.
     */
    "versions": {
        /**
         * The version of Minecraft used by this modpack.
         * This should be in the format used by the version.json files.
         */
        "minecraft": string
        /**
         * The version of Forge used by this modpack.
         * This version must not include the Minecraft version as a prefix.
         */
        "forge"?: string
        /** The version of Fabric loader used by this modpack. */
        "fabric"?: string
        /** The version of Quilt loader used by this modpack. */
        "quilt"?: string
        /** The version of Liteloader used by this modpack. */
        "liteloader"?: string
        "neoforge"?: string
    },
    /** Additional options */
    "options"?: {
        /**
         * A list of additional Minecraft versions to accept when installing or updating mods.
         * @see https://packwiz.infra.link/tutorials/creating/adding-mods/
         */
        "acceptable-game-versions"?: string[]
        /**
         * The folder in which new metadata files will be added,
         * defaulting to a folder based on the category
         * (mods, resourcepacks, etc; if the category is unknown the current directory is used)
         */
        "meta-folder"?: string
        /** deprecated; aliassed to meta-folder */
        "mods-folder"?: string
        /**
         * The base folder from which meta-folder will be resolved,
         * defaulting to the current directory
         * (so you can put all mods/etc in a subfolder while still using the default behaviour)
         */
        "meta-folder-base"?: string
        /**
         * If this is set to true,
         * packwiz will not generate hashes of local files,
         * to prevent merge conflicts and inconsistent hashes when using git/etc.
         * 
         * - `packwiz refresh --build` can be used in this mode to generate internal hashes
         * for distributing the pack with packwiz-installer
         */
        "no-internal-hashes"?: boolean
        /**
         * The folder in which datapacks are to be added;
         * specific to the datapack loader mod you use,
         * and must be set to add datapacks
         * (that are not bundled as mods)
         */
        "datapack-folder"?: string
    }
}
/**
 * The index file of the modpack,
 * storing references to every file to be downloaded in the pack.
 */
interface Index {
    /** The default hash format for every file in the index. @see {@link HashFormat} */
    "hash-format": HashFormat
    /**
     * The files listed in this index.
     * If it is not defined, defaults to an empty list.
     */
    "files"?: [{
        /**
         * The path to the file to be downloaded,
         * relative to this index file.
         * @see {@link Path}
         */
        "file": Path
        /** The hash of the specified file, as a string. @see {@link Hash} */
        "hash": Hash
        /**
         * The name with which this file should be downloaded,
         * instead of the filename specified in the path.
         * Not compatible with metafile,
         * and may not be very well supported.
         */
        "alias"?: string
        /**
         * The hash format for the hash of the specified file.
         * Defaults to the hash format specified in the index -
         * ideally remove this value if it is equal to the hash format for the index to save space.
         * @see {@link HashFormat}
         */
        "hash-format"?: HashFormat
        /**
         * True when this entry points to a .toml metadata file,
         * which references a file outside the pack.
         */
        "metafile"?: boolean
        /**
         * When this is set to true,
         * the file is not overwritten if it already exists,
         * to preserve changes made by a user.
         */
        "preserve"?: boolean
    }]
}
/**
 * A metadata file which references an external file from a URL.
 * This allows for side-only mods,
 * optional mods and stores metadata to allow finding updates from Modrinth and CurseForge.
 * The "mod" terminology is used a lot here,
 * but this should work for any file.
 */
interface Mod {
    /**
     * The destination path of the mod file,
     * relative to this file.
     * @see {@link Path}
     */
    "filename": Path
    /**
     * The name of the mod,
     * which can be displayed in user interfaces to identify the mod.
     * It does not need to be unique between mods,
     * although this may cause confusion.
     */
    "name": string
    /** The side on which this mod should be installed. @see {@link Side} */
    "side"?: Side
    /** Information about how to download this mod. */
    "download": {
        /** The hash format for the hash of the specified file. @see {@link HashFormat} */
        "hash-format": HashFormat
        /** The hash of the specified file, as a string. @see {@link Hash} */
        "hash": Hash
        /** The URL to download the mod from. @see {@link URL} */
        "url"?: Url
        "mode"?: string
    }
    /**
     * Information about the optional state of this mod.
     * When excluded, this indicates that the mod is not optional.
     */
    "option"?: {
        /**
         * Whether or not the mod is optional.
         * This can be set to false if you want to keep the description but make the mod required.
         */
        "optional": boolean
        /**
         * If true, the mod will be enabled by default.
         * If false, the mod will be disabled by default.
         * If a pack format does not support optional mods but it does support disabling mods,
         * the mod will be disabled if it defaults to being disabled.
         */
        "default"?: boolean
        /**
         * A description displayed to the user when they select optional mods.
         * This should explain why or why not the user should enable the mod.
         */
        "description"?: string
    }
    /**
     * Information about how to update the download details of this mod with tools.
     * 
     * If this object does not exist or there are no defined update sources,
     * the mod will not be automatically updated.
     * 
     * If there are multiple defined update sources,
     * one of them will be chosen.
     * The source that is chosen is not defined,
     * so it is therefore dependent on the implementation of the tool
     * (may not be deterministic, so do not rely on one source being chosen over another).
     */
    "update"?: {
        /** An update source for updating mods downloaded from CurseForge. */
        "curseforge"?: {
            /**
             * An integer representing the unique file ID of this mod file.
             * This can be used if more metadata needs to be obtained relating to the mod.
             */
            "file-id": number
            /**
             * An integer representing the unique project ID of this mod.
             * Updating will retrieve the latest file for this project ID that is valid
             * (correct Minecraft version, release channel, modloader, etc.).
             */
            "project-id": number
        }
        /** An update source for updating mods downloaded from Modrinth. */
        "modrinth"?: {
            /**
             * A string representing the unique mod ID of this mod.
             * Updating will retrieve the latest file for this project ID that is valid
             * (correct Minecraft version, release channel, modloader, etc.).
             */
            "mod-id": string
            /**
             * A string representing the unique version ID of this file.
             * This can be used if more metadata needs to be obtained relating to the mod.
             */
            "version": string
        }
    }
}