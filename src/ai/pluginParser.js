import { simple } from "acorn-walk";

function literal(node) {
    if (!node) return null;

    switch (node.type) {
        case "Literal":
            return node.value;

        case "TemplateLiteral":
            if (node.expressions.length === 0) {
                return node.quasis[0].value.cooked;
            }
            return null;

        case "ArrayExpression":
            return node.elements.map(literal);

        case "ObjectExpression":
            return Object.fromEntries(
                node.properties
                    .filter(prop => prop.type === "Property")
                    .map(prop => [
                        prop.key.type === "Identifier"
                            ? prop.key.name
                            : prop.key.value,
                        literal(prop.value)
                    ])
            );

        case "UnaryExpression":
            if (node.operator === "-") {
                return -literal(node.argument);
            }
            return null;

        case "Identifier":
            switch (node.name) {
                case "undefined":
                    return undefined;
                case "Infinity":
                    return Infinity;
                case "NaN":
                    return NaN;
                default:
                    return node.name;
            }

        case "RegExpLiteral":
            return new RegExp(node.pattern, node.flags);

        default:
            return null;
    }
}

export function parsePlugin(ast, file = "") {
    const plugin = {
        file,

        help: null,
        tags: null,
        command: null,
        customPrefix: null,
        desc: null,
        limit: null,
        exp: null,

        owner: false,
        rowner: false,
        group: false,
        admin: false,
        botAdmin: false,
        premium: false,
        register: false,
        private: false
    };

    simple(ast, {
        AssignmentExpression(node) {
            const left = node.left;

            if (
                left.type !== "MemberExpression" ||
                left.object.type !== "Identifier" ||
                left.object.name !== "handler"
            ) {
                return;
            }

            const prop =
                left.property.type === "Identifier"
                    ? left.property.name
                    : left.property.value;

            if (!(prop in plugin)) return;

            plugin[prop] = literal(node.right);
        }
    });

    return plugin;
}