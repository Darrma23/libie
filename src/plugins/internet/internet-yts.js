import { canvas } from "#canvas/yts.js";

let handler = async (m, { conn, text, usedPrefix, command }) => {
    if (!text) {
        return m.reply(`Need query\nEx: ${usedPrefix + command} bmth`);
    }

    try {
        await global.loading(m, conn);

        const url = `https://libieapiofficial.dpdns.org/tools/yts?q=${encodeURIComponent(text)}&limit=20`;
        const res = await fetch(url);

        if (!res.ok) {
            throw new Error(`API failed: ${res.status} ${res.statusText}`);
        }

        const json = await res.json();

        if (!json?.status || !Array.isArray(json?.data)) {
            throw new Error("Invalid API response");
        }

        const vids = json.data;

        if (!vids.length) {
            return m.reply(`No results for "${text}"`);
        }

        // ✅ Normalize ringan → canvas-friendly & future-proof
        const normalizedVideos = vids.map(v => ({
            title: v.title,
            channel: v.author,        // canvas fallback aman
            thumbnail: v.thumbnail,   // canvas fallback aman
            duration: v.duration,
            views: v.views,
            ago: v.ago
        }));

        const imageBuffer = await canvas(normalizedVideos, text);

        const rows = vids.map((v, i) => ({
            header: `Result ${i + 1}`,
            title: v.title,
            description: `${v.author} • ${v.duration ?? "-"}`,
            id: `.play ${v.url}`,
        }));

        await conn.client(m.chat, {
            image: imageBuffer,
            caption: `🔎 Results for: *${text}*`,
            title: "YouTube Search",
            footer: `Found ${vids.length} videos`,
            interactiveButtons: [
                {
                    name: "single_select",
                    buttonParamsJson: JSON.stringify({
                        title: "Select Video",
                        sections: [
                            {
                                title: `Search Results (${vids.length})`,
                                rows
                            }
                        ]
                    }),
                }
            ],
            hasMediaAttachment: true,
        });

    } catch (e) {
        global.logger.error("YTS ERROR:", e);
        m.reply(`Error: ${e.message}`);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["yts"];
handler.tags = ["internet"];
handler.command = /^(yts)$/i;

export default handler;