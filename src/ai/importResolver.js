/**
 * Resolve project import aliases to real file paths.
 *
 * @param {string} specifier
 * @returns {string|null}
 */
export function resolveImport(specifier) {
    if (!specifier.startsWith("#")) {
        return null;
    }

    const aliases = {
        "#api/": "src/lib/api/",
        "#canvas/": "src/lib/canvas/",
        "#lib/": "src/lib/",
        "#database/": "src/database/",
        "#services/": "src/services/",
        "#plugins/": "src/plugins/"
    };

    for (const [alias, target] of Object.entries(aliases)) {
        if (specifier.startsWith(alias)) {
            return target + specifier.slice(alias.length);
        }
    }

    return null;
}

export default resolveImport;