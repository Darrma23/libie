/**
 * @file WhatsApp ID extractor command handler
 * @module plugins/tools/cekid
 */

let handler = async (m, { conn, args, usedPrefix }) => {
    try {
        const text = args.join(" ");
        if (!text) {
            return m.reply(`Usage:\n${usedPrefix}cekid <link group / channel>`);
        }

        let url;
        try {
            url = new URL(text);
        } catch {
            return m.reply("Format link tidak valid.");
        }

        const isGroup =
            url.hostname === "chat.whatsapp.com" &&
            /^\/[A-Za-z0-9]{20,24}$/.test(url.pathname);

        const isChannel =
            (url.hostname === "whatsapp.com" || url.hostname === "www.whatsapp.com") &&
            url.pathname.startsWith("/channel/");

        let id, messageText, title;

        if (isGroup) {
            const code = url.pathname.replace(/^\/+/, "");
            const res = await conn.groupGetInviteInfo(
                `https://chat.whatsapp.com/${code}`
            );

            id = res.id;
            title = "CEK ID GROUP";

            messageText =
                `ID Grup  : ${res.id}\n` +
                `Nama     : ${res.subject}\n` +
                `Owner    : ${res.owner?.split("@")[0] || "Tidak diketahui"}\n` +
                `Member   : ${res.size || "?"}`;

        } else if (isChannel) {
            const code = url.pathname.split("/channel/")[1]?.split("/")[0];
            if (!code) return m.reply("Link channel tidak valid.");

            id = code;
            title = "CEK ID CHANNEL";

            messageText =
                `ID Channel : ${code}\n` +
                `Catatan    : Metadata channel dibatasi oleh WhatsApp.`;

        } else {
            return m.reply("Link tidak didukung.");
        }

        // ===== FIX UTAMA =====
        // Copy button hanya aman di PRIVATE CHAT
        if (m.chat.endsWith("@s.whatsapp.net")) {
            await conn.client(m.chat, {
                text: messageText,
                title,
                footer: "Click button to copy",
                interactiveButtons: [
                    {
                        name: "cta_copy",
                        buttonParamsJson: JSON.stringify({
                            display_text: "Copy",
                            copy_code: id,
                        }),
                    },
                ],
                hasMediaAttachment: false,
            });
        } else {
            // GRUP: plain text, no interactive
            await conn.sendMessage(m.chat, {
                text: `${messageText}\n\n(ID disalin manual)`
            });
        }

    } catch (e) {
        console.error(e);
        m.reply("Terjadi kesalahan saat memproses permintaan.");
    }
};

handler.help = ["cekid"];
handler.tags = ["tools"];
handler.command = /^(cekid|id)$/i;

export default handler;