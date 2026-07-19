/**
 * @file Repository Indexer
 * @module src/ai/indexer
 */

import { scanRepo } from "./scanner.js";
import { readFile } from "./reader.js";
import { parseAST } from "./ast.js";
import { parsePlugin } from "./pluginParser.js";
import { parseSymbols } from "./symbolParser.js";

let cache = null;

/**
 * Normalisasi key index.
 *
 * @param {string} value
 * @returns {string|null}
 */
function normalize(value) {
    if (typeof value !== "string") {
        return null;
    }

    return value.trim().toLowerCase();
}

/**
 * Tambahkan value ke Map<Array>.
 *
 * @param {Map} map
 * @param {string} key
 * @param {*} value
 */
function add(map, key, value) {
    key = normalize(key);

    if (!key) {
        return;
    }

    const list = map.get(key);

    if (list) {
        list.push(value);
    } else {
        map.set(key, [value]);
    }
}

function indexHelp(map, plugin) {
    if (Array.isArray(plugin.help)) {
        for (const help of plugin.help) {
            add(map, help, plugin);
        }
    } else {
        add(map, plugin.help, plugin);
    }
}

function indexTags(map, plugin) {
    if (!Array.isArray(plugin.tags)) {
        return;
    }

    for (const tag of plugin.tags) {
        add(map, tag, plugin);
    }
}

function indexCommands(map, plugin) {
    if (Array.isArray(plugin.command)) {
        for (const command of plugin.command) {
            const key = normalize(command);

            if (key) {
                map.set(key, plugin);
            }
        }

        return;
    }

    if (typeof plugin.command === "string") {
        const key = normalize(plugin.command);

        if (key) {
            map.set(key, plugin);
        }
    }
}

function indexImports(map, symbols, plugin) {
    for (const imp of symbols.imports ?? []) {
        add(map, imp, plugin);
    }
}

/**
 * Build repository index.
 *
 * @param {boolean} [force=false]
 * @returns {Promise<Object>}
 */
export async function buildIndex(force = false) {
    if (cache && !force) {
        return cache;
    }

    const files = await scanRepo();

    const plugins = [];

    const byCommand = new Map();
    const byHelp = new Map();
    const byTag = new Map();
    const byImport = new Map();

    for (const file of files) {
        if (!file.path.startsWith("src/plugins/")) {
            continue;
        }

        if (!file.path.endsWith(".js")) {
            continue;
        }

        try {
            const code = await readFile(file.path);

            if (file.path.endsWith("tool-whatsmusic.js")) {
                console.log("TYPE:", typeof code);
                console.log("LEN :", code.length);
                console.log("HEAD:", JSON.stringify(code.slice(0, 40)));
            }
            const ast = parseAST(code);

            const plugin = parsePlugin(ast, file.path);
            const symbols = parseSymbols(ast, file.path);

            const entry = {
                ...plugin,
                symbols
            };

            plugins.push(entry);

            indexHelp(byHelp, entry);
            indexTags(byTag, entry);
            indexCommands(byCommand, entry);
            indexImports(byImport, symbols, entry);
        } catch (err) {
            console.error("[Indexer]", file.path, err);
        }
    }
   console.log("========== INDEX ==========");
   console.log("Plugins :", plugins.length);
   console.log("Commands :", [...byCommand.keys()]);
   console.log("===========================");

    cache = {
        plugins,
        byCommand,
        byHelp,
        byTag,
        byImport
    };
   
    return cache;
}

/**
 * Hapus cache index.
 */
export function clearIndex() {
    cache = null;
}

export default {
    buildIndex,
    clearIndex
};