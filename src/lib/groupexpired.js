export default async function groupExpired(conn) {
    for (const jid in global.db.data.chats) {

        const chat = global.db.data.chats[jid]

        if (!chat.isGroup) continue

        if (!chat.expired) continue

        if (Date.now() < chat.expired) continue

        try {

            await conn.sendMessage(jid, {
                text:
`⏳ Masa aktif bot telah habis.

Terima kasih telah menggunakan Libie.
Bot akan keluar dari grup.`
            })

            await conn.groupLeave(jid)

            delete global.db.data.chats[jid]

        } catch (e) {
            global.logger.error(e)
        }
    }
}