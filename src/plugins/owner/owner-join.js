/**
 * @file Join group via invite link
 * @module plugins/owner/join
 * @license Apache-2.0
 * @author Himejima
 */

const linkRegex = /(?:https?:\/\/)?chat\.whatsapp\.com\/([A-Za-z0-9]{20,24})/i

const handler = async (m, { conn, text }) => {
    if (!text) {
        return m.reply(`
Contoh:

.join https://chat.whatsapp.com/xxxx

atau

.join 30 https://chat.whatsapp.com/xxxx
`.trim())
    }

    const args = text.trim().split(/\s+/)

    let days = 0
    let link

    if (/^\d+$/.test(args[0])) {
        days = Number(args[0])
        link = args[1]
    } else {
        link = args[0]
    }

    if (!link) {
        return m.reply("Masukkan link grup.")
    }

    if (!Number.isSafeInteger(days) || days < 0 || days > 999) {
        return m.reply("Hari harus 1-999 atau kosong untuk Unlimited.")
    }

    const match = link.match(linkRegex)

    if (!match) {
        return m.reply("Link grup tidak valid.")
    }

    const code = match[1]

    try {
        await global.loading(m, conn)

        let metadata

        try {
            metadata = await conn.groupGetInviteInfo(code)
        } catch {
            return m.reply("Link grup sudah tidak berlaku atau tidak dapat diakses.")
        }

        const jid = await conn.groupAcceptInvite(code)

        if (!jid) {
            return m.reply("Gagal mendapatkan ID grup.")
        }

        const chat = global.db.data.chats[jid]

        chat.expired = days
            ? Date.now() + days * 86400000
            : 0

        await conn.client(m.chat, {
            title: "Join Group",
            text: `✅ Berhasil bergabung ke grup.

📛 Nama Grup : ${metadata.subject}
🆔 ID Grup : ${jid}

⏳ Masa Aktif :
${days ? `${days} Hari` : "Unlimited"}`,
            footer: global.config.watermark,
            hasMediaAttachment: false
        })

        try {
            await conn.sendMessage(jid, {
                text: days
                    ? `Halo semuanya 👋

Bot berhasil bergabung.

⏳ Masa aktif bot: *${days} hari*

Bot akan keluar otomatis ketika masa aktif berakhir.`
                    : `Halo semuanya 👋

Bot berhasil bergabung.

♾️ Masa aktif bot: *Unlimited*.`
            })
        } catch {}

    } catch (e) {
        const msg = String(e?.message || e)

        if (/already|exists|member/i.test(msg)) {
            return m.reply("Bot sudah berada di grup tersebut.")
        }

        return m.reply(`Gagal bergabung ke grup.\n\n${msg}`)
    } finally {
        await global.loading(m, conn, true)
    }
}

handler.help = ["join [hari] <link>"]
handler.tags = ["owner"]
handler.command = /^join$/i
handler.owner = true

export default handler