/**
 * @file AST Extractor
 * @module src/ai/extractor
 */

import { simple as walk } from "acorn-walk";

/**
 * Ambil source code berdasarkan posisi AST node.
 *
 * @param {string} code
 * @param {object} node
 * @returns {string}
 */
function sliceNode(code, node) {
    if (!node) {
        return "";
    }

    return code.slice(node.start, node.end);
}

/**
 * Ambil semua export dalam file.
 *
 * @param {object} ast
 * @param {string} code
 * @returns {Map<string,string>}
 */
export function extractExports(ast, code) {
    const result = new Map();

    walk(ast, {
        ExportNamedDeclaration(node) {
            const decl = node.declaration;

            if (!decl) {
                return;
            }

            switch (decl.type) {
                case "FunctionDeclaration":
                case "ClassDeclaration":
                    if (decl.id) {
                        result.set(decl.id.name, sliceNode(code, node));
                    }
                    break;

                case "VariableDeclaration":
                    for (const d of decl.declarations) {
                        if (d.id.type === "Identifier") {
                            result.set(d.id.name, sliceNode(code, node));
                        }
                    }
                    break;
            }
        },

        ExportDefaultDeclaration(node) {
            result.set("default", sliceNode(code, node));
        }
    });

    return result;
}

/**
 * Ambil semua function.
 *
 * @param {object} ast
 * @param {string} code
 * @returns {Map<string,string>}
 */
export function extractFunctions(ast, code) {
    const result = new Map();

    walk(ast, {
        FunctionDeclaration(node) {
            if (node.id) {
                result.set(node.id.name, sliceNode(code, node));
            }
        }
    });

    return result;
}

/**
 * Ambil semua class.
 *
 * @param {object} ast
 * @param {string} code
 * @returns {Map<string,string>}
 */
export function extractClasses(ast, code) {
    const result = new Map();

    walk(ast, {
        ClassDeclaration(node) {
            if (node.id) {
                result.set(node.id.name, sliceNode(code, node));
            }
        }
    });

    return result;
}

/**
 * Ambil semua variable.
 *
 * @param {object} ast
 * @param {string} code
 * @returns {Map<string,string>}
 */
export function extractVariables(ast, code) {
    const result = new Map();

    walk(ast, {
        VariableDeclaration(node) {
            for (const decl of node.declarations) {
                if (decl.id.type === "Identifier") {
                    result.set(decl.id.name, sliceNode(code, node));
                }
            }
        }
    });

    return result;
}

export default {
    extractExports,
    extractFunctions,
    extractClasses,
    extractVariables
};