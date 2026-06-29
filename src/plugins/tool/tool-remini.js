/**
 * @file Image enhancement (HD/Remini) command handler
 * @module plugins/tools/remini
 * @license Apache-2.0
 * @author Himejima
 */

import { remini } from "#api/remini.js";

let handler = async (m, { conn, command, usedPrefix }) => {
    // Prioritas: quoted dulu, kalau ga ada baru cek m sendiri
    const q = m.quoted?.mimetype ? m.quoted : (m.msg?.mimetype ? m : null);

    if (!q) {
        return m.reply(`Reply atau kirim gambar.\nContoh: ${usedPrefix + command}`);
    }

    const mime = (q.msg || q).mimetype || "";

    if (!/image\/(jpe?g|png|webp)/i.test(mime)) {
        return m.reply(`Reply atau kirim gambar.\nContoh: ${usedPrefix + command}`);
    }

    try {
        await global.loading(m, conn);

        const img = await q.download();
        if (!img || !img.length) return m.reply("Gagal mendownload gambar.");

        const { success, resultUrl, error } = await remini(img);

        if (!success) {
            return m.reply(error || "Gagal meningkatkan kualitas gambar.");
        }

        await conn.sendMessage(
            m.chat,
            {
                image: { url: resultUrl },
                caption: "✨ Image Enhanced",
            },
            { quoted: m }
        );
    } catch (e) {
        m.reply(e.message);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["hd"];
handler.tags = ["tools"];
handler.command = /^(remini|hd)$/i;

export default handler;