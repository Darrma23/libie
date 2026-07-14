/**
 * @file Add member to group command handler
 * @module plugins/group/add
 */

let handler = async (m, { conn, args }) => {
    const number = args[0]?.replace(/\D/g, "");

    if (!number) {
        return m.reply("Contoh:\n.add 628xxx");
    }

    const jid = `${number}@s.whatsapp.net`;

    try {
        const result = await conn.groupParticipantsUpdate(
            m.chat,
            [jid],
            "add"
        );

        const status = result?.[0]?.status;

        if (status !== "200") {
            return m.reply(`Gagal menambahkan member.\nStatus: ${status}`);
        }

        await conn.sendMessage(
            m.chat,
            {
                text: `✅ Berhasil menambahkan @${number}`,
                mentions: [jid]
            },
            { quoted: m }
        );
    } catch (e) {
        m.reply(e.message);
    }
};

handler.help = ["add"];
handler.tags = ["group"];
handler.command = /^add$/i;

handler.group = true;
handler.admin = true;
handler.botAdmin = true;

export default handler;