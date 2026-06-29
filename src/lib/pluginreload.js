import chokidar from "chokidar";
import { pathToFileURL } from "node:url";

export default function watchPlugins(pluginDir) {
    chokidar.watch(pluginDir, {
        ignoreInitial: true
    }).on("change", async (file) => {
        try {
            const module = await import(
                pathToFileURL(file).href + `?update=${Date.now()}`
            );

            global.plugins[file.split("/").pop()] =
                module.default || module;

            console.log("[Reload]", file);
        } catch (e) {
            console.error("[Reload Error]", e);
        }
    });
}