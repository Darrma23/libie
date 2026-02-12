/**
 * @file DeepSeek AI chat command handler
 * @module plugins/ai/deepseek
 * @license Apache-2.0
 */

/**
 * Interacts with DeepSeek AI for text generation
 * @async
 * @function handler
 * @param {Object} m - Message object
 * @param {Object} conn - Connection object
 * @param {string} text - User query/prompt
 * @returns {Promise<void>}
 */

import axios from "axios";
import crypto from "crypto";
import fs from "fs";

const CONFIG = {
    URLS: {
        CHAT: "https://deepseekv2-qbvg2hl3qq-uc.a.run.app",
        KEY: "https://rotatingkey-qbvg2hl3qq-uc.a.run.app"
    },
    HEADERS: {
        "User-Agent": "okhttp/4.12.0",
        "Accept-Encoding": "gzip",
        "Content-Type": "application/json"
    },
    AES_INPUT_KEY: "NiIsImtpZCI6I56"
};

async function getSecretKey() {
    try {
        const res = await axios.get(CONFIG.URLS.KEY, {
            headers: { "User-Agent": "Android", "Accept-Encoding": "gzip" }
        });
        return res.data?.rotatingKey || null;
    } catch {
        return null;
    }
}

function generateSecurityHeaders(secretKey) {
    try {
        const iv = crypto.randomBytes(16);
        const ivBase64 = iv.toString("base64");
        const keyBuffer = Buffer.from(secretKey, "utf8");

        const cipher = crypto.createCipheriv("aes-128-cbc", keyBuffer, iv);
        let encrypted = cipher.update(CONFIG.AES_INPUT_KEY, "utf8");
        encrypted = Buffer.concat([encrypted, cipher.final()]);

        return {
            iv: ivBase64 + "\n",
            authorization: "Bearer " + encrypted.toString("base64")
        };
    } catch {
        return null;
    }
}

let handler = async (m, { conn, text }) => {
    if (!text) return m.reply("Masukin prompt dulu. AI bukan cenayang.");

    try {
        await global.loading(m, conn);

        const secretKey = await getSecretKey();
        if (!secretKey) return m.reply("Gagal ambil secret key.");

        const security = generateSecurityHeaders(secretKey);
        if (!security) return m.reply("Gagal generate header keamanan.");

        const payload = {
            data: text,
            iv: security.iv,
            messages: [],
            model: "deepseek-chat",
            secretKey
        };

        const res = await axios.post(CONFIG.URLS.CHAT, payload, {
            headers: {
                ...CONFIG.HEADERS,
                authorization: security.authorization
            }
        });

        const apiResult = res.data?.data;
        const reply =
            apiResult?.choices?.[0]?.message?.content ||
            null;

        if (!reply) return m.reply("AI-nya diem. Kaya kamu pas ditanya masa depan.");

        await conn.sendMessage(
            m.chat,
            { text: `DeepSeek:\n${reply.trim()}` },
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
    "Menerima prompt berbasis teks",
    "Menghasilkan jawaban AI",
    "Menggunakan wrapper DeepSeek (unofficial)",
    "Handle error & respons kosong"
];

export default handler;