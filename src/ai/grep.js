import fg from "fast-glob";
import fs from "node:fs/promises";

const IGNORE = [
    "node_modules/**",
    ".git/**",
    "src/database/**"
];

export async function grep(keyword) {
    const files = await fg(["**/*.js"], {
        cwd: process.cwd(),
        ignore: IGNORE
    });

    const results = [];

    for (const file of files) {
        const text = await fs.readFile(file, "utf8");
        const lines = text.split("\n");

        lines.forEach((line, index) => {
            if (line.includes(keyword)) {
                results.push({
                    file,
                    line: index + 1,
                    text: line.trim()
                });
            }
        });
    }

    return results;
}