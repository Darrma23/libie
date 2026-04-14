let handler = async (m, {
    conn,
    text,
    usedPrefix,
    command
}) => {
    try {
        if (!text) return m.reply(`Masukan Format Dengan Benar!\n\nContoh:\n${usedPrefix + command} https://t.me/addstickers/NamaPack`)

        if (!text.startsWith("https://t.me/addstickers/"))
            return m.reply("❌ URL tidak valid. Gunakan link Telegram sticker pack.\nContoh: https://t.me/addstickers/NamaPack")

        await global.loading(m, conn)

        let url = API('theresav', '/download/telestick', {
            url: text
        }, 'apikey')
        let res = await fetch(url)
        let json = await res.json()

        if (!json.status) throw 'Gagal mengambil data. Pastikan URL benar.'

        const pack = json.result

        // Download semua sticker jadi Buffer
        const stickerBuffers = []
        for (const s of pack.stickers) {
            const r = await fetch(s.image_url)
            const ab = await r.arrayBuffer()
            const buf = Buffer.from(new Uint8Array(ab))
            stickerBuffers.push({
                data: buf, // Buffer — required by getStream(s.data || s.sticker)
                emojis: [s.emoji || '🎨']
            })
        }

        // Cover wajib ada — pakai buffer sticker pertama
        const cover = stickerBuffers[0].data

        await conn.sendMessage(
            m.chat, {
                stickerPack: {
                    name: pack.title,
                    publisher: pack.name,
                    description: `${pack.stickers.length} stickers | ${pack.sticker_type}`,
                    cover,
                    stickers: stickerBuffers
                }
            }, {
                quoted: m
            }
        )

    } catch (e) {
        throw e
    } finally {
        await global.loading(m, conn, true)
    }
}

handler.help = ['telestick']
handler.tags = ['maker']
handler.command = /^(telestick)$/i

export default handler