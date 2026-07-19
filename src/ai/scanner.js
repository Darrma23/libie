import fg from "fast-glob";
import fs from "node:fs/promises";

const IGNORE = [
    "node_modules/**",
    ".git/**",
    "src/database/**"
];

export async function scanRepo() {
    const files = await fg([
        "**/*.js",
        "**/*.md",
        "package.json"
    ], {
        cwd: process.cwd(),
        ignore: IGNORE
    });

    const result = [];

    for (const path of files.sort()) {
        const stat = await fs.stat(path);

        result.push({
            path,
            size: stat.size,
            modified: stat.mtimeMs
        });
    }

    return result;
}