/**
 * @file DeepSeek AI chat command handler
 * @module plugins/ai/deepseek
 * @license Apache-2.0
 */

import axios from "axios";

const API_URL = "https://libieapiofficial.dpdns.org/api/ai/deepseek";

let handler = async (m, { conn, text }) => {
    if (!text) {
        return m.reply("Masukin prompt dulu. AI bukan dukun santet digital.");
    }

    try {
        await global.loading(m, conn);

        const { data } = await axios.get(API_URL, {
            params: {
                prompt: text,
                model: "deepseek-chat"
            },
            headers: {
                "User-Agent": "Mozilla/5.0"
            }
        });

        if (!data?.status) {
            return m.reply("API gagal kasih respons. Mesin juga capek ngadepin manusia.");
        }

        const reply = data?.data?.result;

        if (!reply) {
            return m.reply("Respons AI kosong. Entah AI-nya tidur atau servernya lagi galau.");
        }

        await conn.sendMessage(
            m.chat,
            {
                text: `DeepSeek:\n${reply.trim()}`
            },
            { quoted: m }
        );

    } catch (e) {
        m.reply(`Error: ${e.message}`);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["deepseek"];
handler.tags = ["ai"];
handler.command = /^(deepseek|ds)$/i;

handler.desc = [
    "Chat dengan DeepSeek AI",
    "Menggunakan API unofficial",
    "Support model deepseek-chat",
    "Input prompt teks",
    "Handle error & respons kosong"
];

export default handler;