/**
 * @file Advanced multi uploader command
 * @module plugins/tools/upload
 * @license Apache-2.0
 * @author Himejima
 */

import {
    uploader1,
    uploader2,
    uploader3,
    uploader4,
    uploader5,
    uploader6,
    uploader7,
    uploader,
} from "#lib/uploader.js";

/**
 * Upload servers
 * Qu.ax prioritized
 */
const servers = {
    1: {
        name: "Qu.ax",
        fn: uploader3,
        types: ["all"],
    },

    2: {
        name: "Catbox.moe",
        fn: uploader1,
        types: ["all"],
    },

    3: {
        name: "Uguu.se",
        fn: uploader2,
        types: ["all"],
    },

    4: {
        name: "Put.icu",
        fn: uploader4,
        types: ["all"],
    },

    5: {
        name: "Tmpfiles.org",
        fn: uploader5,
        types: ["all"],
    },

    6: {
        name: "Videy",
        fn: uploader6,
        types: ["video"],
    },

    7: {
        name: "GoFile",
        fn: uploader7,
        types: ["image"],
    },
};

/**
 * Format file size
 */
const formatSize = (bytes = 0) => {
    const kb = bytes / 1024;
    const mb = kb / 1024;

    return mb >= 1
        ? `${mb.toFixed(2)} MB`
        : `${kb.toFixed(2)} KB`;
};

/**
 * Detect media type
 */
const detectType = (mime = "") => {
    if (mime.startsWith("image/")) return "image";
    if (mime.startsWith("video/")) return "video";
    if (mime.startsWith("audio/")) return "audio";

    return "file";
};

/**
 * Upload menu
 */
const uploadMenu = (usedPrefix, command) => `
*Upload Server*

1. Qu.ax
2. Catbox.moe
3. Uguu.se
4. Put.icu
5. Tmpfiles.org
6. Videy (Video only)
7. GoFile (Image only)

Example:
${usedPrefix + command} 1
`.trim();

/**
 * Send upload result
 */
async function sendResult(conn, m, text, url) {
    return conn.client(
        m.chat,
        {
            text,
            interactiveButtons: [
                {
                    name: "cta_copy",
                    buttonParamsJson: JSON.stringify({
                        display_text: "Copy URL",
                        copy_code: url,
                    }),
                },
            ],
        },
        { quoted: m }
    );
}

/**
 * Main command handler
 */
let handler = async (m, { conn, args, usedPrefix, command }) => {
    try {
        const q = m.quoted?.mimetype ? m.quoted : m;

        const mime =
            (q.msg || q).mimetype ||
            q.mediaType ||
            "";

        /**
         * No media
         */
        if (!mime) {
            return m.reply(uploadMenu(usedPrefix, command));
        }

        /**
         * Download media
         */
        await global.loading?.(m, conn);

        const buffer = await q.download?.();

        if (!buffer || !Buffer.isBuffer(buffer)) {
            return m.reply("Failed download media");
        }

        /**
         * File info
         */
        const size = formatSize(buffer.length);
        const mediaType = detectType(mime);

        /**
         * Auto upload
         */
        if (!args[0]) {
            const res = await uploader(buffer, conn?.logger);

            if (!res?.success) {
                return m.reply(
                    `Upload failed.\nType: ${mediaType}\nSize: ${size}`
                );
            }

            return sendResult(
                conn,
                m,
                `Uploaded

Server: ${res.provider}
Type: ${mediaType}
Size: ${size}`,
                res.url
            );
        }

        /**
         * Manual server select
         */
        const num =
            args[0]
                ?.toString()
                .trim()
                .match(/\d+/)?.[0];

        if (!num || !servers[num]) {
            return m.reply("Invalid server (1-7)");
        }

        const srv = servers[num];

        /**
         * Validate server type
         */
        if (
            !srv.types.includes("all") &&
            !srv.types.includes(mediaType)
        ) {
            return m.reply(
                `${srv.name} only supports ${srv.types.join(", ")}`
            );
        }

        let result = null;

        /**
         * Primary upload
         */
        try {
            result = await srv.fn(buffer, conn?.logger);
        } catch (e) {
            conn?.logger?.error?.(
                `[UPLOAD:${srv.name}] ${e.message}`
            );
        }

        /**
         * Fallback
         */
        if (!result) {
            await m.reply(
                `${srv.name} failed.\nTrying fallback uploader...`
            );

            const fallback = await uploader(
                buffer,
                conn?.logger
            );

            if (!fallback?.success) {
                return m.reply(
                    `Upload failed.

Server: ${srv.name}
Type: ${mediaType}
Size: ${size}`
                );
            }

            return sendResult(
                conn,
                m,
                `Uploaded

Primary: ${srv.name} (failed)
Fallback: ${fallback.provider}
Type: ${mediaType}
Size: ${size}`,
                fallback.url
            );
        }

        /**
         * Normalize result
         */
        const url =
            typeof result === "string"
                ? result
                : result?.url;

        if (!url) {
            return m.reply(
                `Upload failed.

Server: ${srv.name}
Type: ${mediaType}
Size: ${size}`
            );
        }

        /**
         * Success
         */
        return sendResult(
            conn,
            m,
            `Uploaded

Server: ${srv.name}
Type: ${mediaType}
Size: ${size}`,
            url
        );
    } catch (e) {
        conn?.logger?.error?.(e);

        return m.reply(
            `Upload error.

${e.message || e}`
        );
    }
};

/**
 * Command metadata
 */
handler.help = ["upload"];
handler.tags = ["tools"];
handler.command = /^(tourl|url|upload)$/i;

export default handler;