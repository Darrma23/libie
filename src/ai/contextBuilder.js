/**
 * @file Context Builder
 * @module src/ai/contextBuilder
 */

import { buildIndex } from "./indexer.js";
import {
    findByCommand,
    findByHelp
} from "./query.js";
import { readFile } from "./reader.js";
import { resolveImport } from "./importResolver.js";

/**
 * @typedef {Object} ContextFile
 * @property {string} file
 * @property {string} content
 */

/**
 * Ambil keyword plugin dari pertanyaan.
 *
 * @param {string} question
 * @param {Object} index
 * @returns {string}
 */
function extractCommand(question, index) {
    question = question.toLowerCase();

    // Cari berdasarkan command
    for (const command of index.byCommand.keys()) {
        if (question.includes(command)) {
            return command;
        }
    }

    // Cari berdasarkan help
    for (const help of index.byHelp.keys()) {
        if (question.includes(help)) {
            return help;
        }
    }

    return question.trim();
}

/**
 * Bangun context repository berdasarkan pertanyaan.
 *
 * @param {string} question
 * @returns {Promise<ContextFile[]>}
 */
export async function buildContext(question) {
    if (!question) {
        throw new Error("Question is required.");
    }

    const index = await buildIndex();
    const files = new Set();

    const keyword = extractCommand(question, index);

    const plugin =
        findByCommand(index, keyword) ??
        findByHelp(index, keyword)?.[0];

    if (!plugin) {
        return [];
    }

    files.add(plugin.file);

    // Ambil dependency langsung
    for (const imp of plugin.symbols?.imports ?? []) {
        const resolved = resolveImport(imp);

        if (resolved) {
            files.add(resolved);
        }
    }

    const context = (
        await Promise.all(
            [...files].map(async (file) => {
                try {
                    return {
                        file,
                        content: await readFile(file)
                    };
                } catch {
                    return null;
                }
            })
        )
    ).filter(Boolean);

    return context;
}

export default buildContext;