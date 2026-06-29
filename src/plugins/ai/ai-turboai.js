/**
 * @file Turbo AI chat command handler
 * @module plugins/ai/turboai
 * @license Apache-2.0
 * @author Himejima
 */

/**
 * Interacts with Turbo AI for text generation
 * @async
 * @function handler
 * @param {Object} m - Message object
 * @param {Object} conn - Connection object
 * @param {string} text - User query/prompt
 * @returns {Promise<void>}
 */

let handler = async (m, { conn, text }) => {
    if (!text) return m.reply("Ask something to Turbo AI");

    try {
        await global.loading(m, conn);

        const res = await fetch("https://theturbochat.com/chat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "User-Agent": "Mozilla/5.0"
            },
            body: JSON.stringify({
                message: text,
                model: "turbo",
                language: "id"
            })
        });

        if (!res.ok) return m.reply("API error");

        const json = await res.json();
        const reply = json?.choices?.[0]?.message?.content;

        if (!reply) return m.reply("No response");

        await conn.sendMessage(
            m.chat,
            {
                text: `Turbo AI:\n${reply.trim()}`
            },
            { quoted: m }
        );
    } catch (e) {
        m.reply(`Error: ${e.message}`);
    } finally {
        await global.loading(m, conn, true);
    }
};

/**
 * Command metadata for help system
 * @property {Array<string>} help - Help text
 * @property {Array<string>} tags - Command categories
 * @property {RegExp} command - Command pattern matching
 */
handler.help = ["turboai"];
handler.tags = ["ai"];
handler.command = /^(turboai)$/i;

handler.desc = [
    "Berinteraksi dengan Turbo AI",
    "Menerima pertanyaan atau prompt berbasis teks",
    "Menghasilkan jawaban AI secara natural",
    "Cocok untuk tanya jawab dan diskusi umum",
    "Menggunakan TurboChat AI",
    "Menangani error API dan respons kosong"
];

export default handler;