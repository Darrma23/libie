/**
 * @file Get group invite link command handler
 * @module plugins/group/linkgc
 * @license Apache-2.0
 * @author Himejima
 */

let handler = async (m, { conn }) => {
    try {
        await global.loading(m, conn);

        const code = await conn.groupInviteCode(m.chat);

       await conn.client(m.chat, {
            text: `Link Group`,
            title: "Result",
            footer: "Use button below to copy",
            interactiveButtons: [
                {
                    name: "cta_copy",
                    buttonParamsJson: JSON.stringify({
                        display_text: "Copy Link",
                        copy_code: `https://chat.whatsapp.com/${code}`,
                    }),
                },
            ],
            hasMediaAttachment: false,
        });
    } catch (e) {
        m.reply(`Gagal mengambil link grup.\n\n${e.message}`);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["linkgc"];
handler.tags = ["group"];
handler.command = /^(linkgc|grouplink|linkgroup)$/i;

handler.group = true;
handler.admin = true;
handler.botAdmin = true;

export default handler;