/**
 * @file Copilot AI
 * @author Naruya Izumi
 */

import { generate } from "../../ai/engine.js";

let handler = async (m, { conn, text }) => {
    if (!text) {
        return m.reply(
`*Copilot AI*

Penggunaan:

.copilot <pertanyaan>
→ AI biasa

.copilot local <pertanyaan>
→ AI dengan context repository`
        );
    }

    const args = text.trim().split(/\s+/);

    let mode = "public";

    if (["local", "-l", "--local"].includes(args[0].toLowerCase())) {
        mode = "local";
        args.shift();
    }

    const question = args.join(" ").trim();

    if (!question) {
        return m.reply("Masukkan pertanyaan.");
    }

    try {
        await global.loading(m, conn);

        const result = await generate({
            provider: "copilot",
            mode,
            question
        });

        await conn.sendMessage(
            m.chat,
            { text: result },
            { quoted: m }
        );

    } catch (e) {
        console.error(e);
        m.reply(`❌ Error: ${e.message}`);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["copilot"];
handler.tags = ["ai"];
handler.command = /^copilot$/i;

handler.owner = true;

export default handler;