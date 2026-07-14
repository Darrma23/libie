/**
 * @file Remove member from group command handler
 * @module plugins/group/kick
 */

let handler = async (m, { conn, args, participants, usedPrefix, command }) => {
    let target = m.mentionedJid?.[0] || m.quoted?.sender;

    if (!target && args[0]) {
        const number = args[0].replace(/\D/g, "");
        if (number) {
            target = `${number}@s.whatsapp.net`;
        }
    }

    const member = participants.find((p) => p.id === target);

    if (!member) {
        return m.reply(
            `Contoh:\n${usedPrefix + command} @user`
        );
    }

    try {
        const result = await conn.groupParticipantsUpdate(
            m.chat,
            [target],
            "remove"
        );

        const status = result?.[0]?.status;

        if (status !== "200") {
            return m.reply(`Gagal mengeluarkan member.\nStatus: ${status}`);
        }

        await conn.sendMessage(
            m.chat,
            {
                text: `✅ Berhasil mengeluarkan @${target.split("@")[0]}`,
                mentions: [target]
            },
            { quoted: m }
        );
    } catch (e) {
        m.reply(e.message);
    }
};

handler.help = ["kick"];
handler.tags = ["group"];
handler.command = /^(kick|remove)$/i;

handler.group = true;
handler.admin = true;
handler.botAdmin = true;

export default handler;