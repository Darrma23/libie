// src/ai/indexer.js
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

/**
 * Search plugins by query.
 * 
 * @param {string} query - Search query
 * @returns {Promise<Array>} Array of results with type and plugin
 */
export async function searchPlugins(query) {
    const index = await buildIndex();
    const results = [];
    const lowerQuery = query.toLowerCase();
    
    // Search by command
    for (const [cmd, plugin] of index.byCommand) {
        if (cmd.includes(lowerQuery)) {
            results.push({ 
                type: 'command', 
                cmd, 
                plugin,
                relevance: cmd.startsWith(lowerQuery) ? 3 : 2 // Prioritaskan yang prefix match
            });
        }
    }
    
    // Search by help
    for (const [help, plugins] of index.byHelp) {
        if (help && help.toLowerCase().includes(lowerQuery)) {
            plugins.forEach(p => {
                // Cek apakah plugin sudah ada di results
                const exists = results.some(r => r.plugin === p && r.type === 'help');
                if (!exists) {
                    results.push({ 
                        type: 'help', 
                        help, 
                        plugin: p,
                        relevance: 1
                    });
                }
            });
        }
    }
    
    // Search by tag
    for (const [tag, plugins] of index.byTag) {
        if (tag && tag.toLowerCase().includes(lowerQuery)) {
            plugins.forEach(p => {
                const exists = results.some(r => r.plugin === p && r.type === 'tag');
                if (!exists) {
                    results.push({ 
                        type: 'tag', 
                        tag, 
                        plugin: p,
                        relevance: 1
                    });
                }
            });
        }
    }
    
    // Sort by relevance
    results.sort((a, b) => (b.relevance || 0) - (a.relevance || 0));
    
    return results;
}

/**
 * Get plugin info by command.
 * 
 * @param {string} command - Command name (without dot)
 * @returns {Promise<Object|null>} Plugin object or null
 */
export async function getPluginInfo(command) {
    const index = await buildIndex();
    const lowerCommand = command.toLowerCase();
    
    // Cari di byCommand (exact match)
    for (const [cmd, plugin] of index.byCommand) {
        if (cmd === lowerCommand) {
            return plugin;
        }
    }
    
    // Cari partial match
    for (const [cmd, plugin] of index.byCommand) {
        if (cmd.includes(lowerCommand) || lowerCommand.includes(cmd)) {
            return plugin;
        }
    }
    
    return null;
}

/**
 * Get all plugins by tag.
 * 
 * @param {string} tag - Tag name
 * @returns {Promise<Array>} Array of plugins
 */
export async function getPluginsByTag(tag) {
    const index = await buildIndex();
    const lowerTag = tag.toLowerCase();
    const results = [];
    
    for (const [t, plugins] of index.byTag) {
        if (t && t.toLowerCase().includes(lowerTag)) {
            results.push(...plugins);
        }
    }
    
    return results;
}

/**
 * Get plugin statistics.
 * 
 * @returns {Promise<Object>} Statistics
 */
export async function getPluginStats() {
    const index = await buildIndex();
    const plugins = index.plugins;
    
    const stats = {
        total: plugins.length,
        byTag: {},
        byCommand: index.byCommand.size,
        commands: [...index.byCommand.keys()]
    };
    
    for (const [tag, plugins] of index.byTag) {
        stats.byTag[tag] = plugins.length;
    }
    
    return stats;
}

// Default export
export default {
    buildIndex,
    clearIndex,
    searchPlugins,
    getPluginInfo,
    getPluginsByTag,
    getPluginStats
};