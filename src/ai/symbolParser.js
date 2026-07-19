import { simple } from "acorn-walk";

function unique(arr) {
    return [...new Set(arr)];
}

export function parseSymbols(ast, file = "") {
    const result = {
        file,
        imports: [],
        exports: [],
        functions: [],
        classes: [],
        variables: []
    };

    simple(ast, {
        ImportDeclaration(node) {
            result.imports.push(node.source.value);
        },

        ExportDefaultDeclaration() {
            result.exports.push("default");
        },

        ExportNamedDeclaration(node) {
            if (node.declaration?.id) {
                result.exports.push(node.declaration.id.name);
            }

            for (const spec of node.specifiers || []) {
                result.exports.push(spec.exported.name);
            }
        },

        FunctionDeclaration(node) {
            if (node.id) {
                result.functions.push(node.id.name);
            }
        },

        VariableDeclaration(node) {
            for (const decl of node.declarations) {
                if (decl.id.type !== "Identifier") continue;

                result.variables.push(decl.id.name);

                if (
                    decl.init &&
                    (
                        decl.init.type === "ArrowFunctionExpression" ||
                        decl.init.type === "FunctionExpression"
                    )
                ) {
                    result.functions.push(decl.id.name);
                }
            }
        },

        ClassDeclaration(node) {
            if (node.id) {
                result.classes.push(node.id.name);
            }
        }
    });

    result.imports = unique(result.imports);
    result.exports = unique(result.exports);
    result.functions = unique(result.functions);
    result.classes = unique(result.classes);
    result.variables = unique(result.variables);

    return result;
}