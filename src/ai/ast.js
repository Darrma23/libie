import { Parser } from "acorn";

export function parseAST(code) {
    return Parser.parse(code, {
        ecmaVersion: "latest",
        sourceType: "module"
    });
}