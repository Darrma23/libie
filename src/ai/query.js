/**
 * @file Repository Query
 * @module src/ai/query
 */

/**
 * Cari plugin berdasarkan command.
 *
 * @param {Object} index
 * @param {string} command
 * @returns {Object|null}
 */
export function findByCommand(index, command) {
    command = command.trim().toLowerCase();

    const direct = index.byCommand.get(command);
    if (direct) {
        return direct;
    }

    for (const plugin of index.plugins) {
        if (!(plugin.command instanceof RegExp)) {
            continue;
        }

        plugin.command.lastIndex = 0;

        if (plugin.command.test(command)) {
            return plugin;
        }
    }

    return null;
}

/**
 * Cari plugin berdasarkan help.
 *
 * @param {Object} index
 * @param {string} help
 * @returns {Object[]}
 */
export function findByHelp(index, help) {
    return index.byHelp.get(help) ?? [];
}

/**
 * Cari plugin berdasarkan tag.
 *
 * @param {Object} index
 * @param {string} tag
 * @returns {Object[]}
 */
export function findByTag(index, tag) {
    return index.byTag.get(tag) ?? [];
}

/**
 * Cari plugin berdasarkan import.
 *
 * @param {Object} index
 * @param {string} imp
 * @returns {Object[]}
 */
export function findByImport(index, imp) {
    return index.byImport.get(imp) ?? [];
}

/**
 * Cari semua plugin owner.
 *
 * @param {Object} index
 * @returns {Object[]}
 */
export function findOwnerPlugins(index) {
    return index.plugins.filter(plugin => plugin.owner);
}

/**
 * Cari semua plugin group.
 *
 * @param {Object} index
 * @returns {Object[]}
 */
export function findGroupPlugins(index) {
    return index.plugins.filter(plugin => plugin.group);
}

/**
 * Helper pencarian symbol.
 *
 * @param {Object} index
 * @param {"functions"|"variables"|"classes"} type
 * @param {string} name
 * @returns {Object[]}
 */
function findBySymbol(index, type, name) {
    return index.plugins.filter(plugin =>
        (plugin.symbols?.[type] ?? []).includes(name)
    );
}

/**
 * Cari plugin berdasarkan function.
 *
 * @param {Object} index
 * @param {string} name
 * @returns {Object[]}
 */
export function findByFunction(index, name) {
    return findBySymbol(index, "functions", name);
}

/**
 * Cari plugin berdasarkan variable.
 *
 * @param {Object} index
 * @param {string} name
 * @returns {Object[]}
 */
export function findByVariable(index, name) {
    return findBySymbol(index, "variables", name);
}

/**
 * Cari plugin berdasarkan class.
 *
 * @param {Object} index
 * @param {string} name
 * @returns {Object[]}
 */
export function findByClass(index, name) {
    return findBySymbol(index, "classes", name);
}

export default {
    findByCommand,
    findByHelp,
    findByTag,
    findByImport,
    findOwnerPlugins,
    findGroupPlugins,
    findByFunction,
    findByVariable,
    findByClass
};