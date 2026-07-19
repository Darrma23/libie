import fs from "node:fs/promises";

export async function readFile(file) {
    return await fs.readFile(file, "utf8");
}