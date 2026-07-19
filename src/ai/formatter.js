/**
 * @file Context Formatter
 * @module src/ai/formatter
 */

const SEPARATOR = "=".repeat(80);

/**
 * @typedef {Object} ContextFile
 * @property {string} file
 * @property {string} content
 */

/**
 * Format repository context menjadi plain text untuk LLM.
 *
 * @param {ContextFile[]} files
 * @returns {string}
 */
export function formatContext(files = []) {
    return files
        .map(({ file, content }) => {
            const body = (content ?? "").trim() || "// Empty file";

            return [
                SEPARATOR,
                `FILE: ${file}`,
                SEPARATOR,
                "",
                body
            ].join("\n");
        })
        .join("\n\n");
}

export default formatContext;