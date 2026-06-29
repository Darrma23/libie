const linkRegex = /chat\.whatsapp\.com\/([0-9A-Za-z]{20,24})/i

let handler = async (m, { conn, text }) => {
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
    let link = ""

    if (/^\d+$/.test(args[0])) {
        days = Number(args[0])
        link = args[1]
    } else {
        link = args[0]
    }

    const match = link?.match(linkRegex)

    if (!match) {
        return m.reply("Link grup tidak valid.")
    }

    const code = match[1]

    let jid

    try {
        jid = await conn.groupAcceptInvite(code)
    } catch {
        return m.reply("Gagal join grup.")
    }

    const chat = global.db.data.chats[jid]

    chat.expired = days > 0
        ? Date.now() + (days * 86400000)
        : 0

    let msg = `✅ Berhasil join grup.\n\n`

    if (days > 0) {
        msg += `Masa aktif : ${days} Hari`
    } else {
        msg += `Masa aktif : Unlimited`
    }

    await m.reply(msg)

    await conn.sendMessage(jid, {
        text: days
            ? `Halo 👋

Bot berhasil bergabung.

Bot aktif selama *${days} hari*.

Jika masa aktif habis, bot akan keluar otomatis.`
            : `Halo 👋

Bot berhasil bergabung.

Bot aktif *selamanya* di grup ini.`
    })
}

handler.help = ["join"]
handler.tags = ["owner"]
handler.command = /^join$/i
handler.owner = true

export default handler