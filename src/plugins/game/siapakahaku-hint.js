let handler = async (m, { conn }) => {
    conn.siapakahaku ??= {}
    const game = conn.siapakahaku[m.chat]
    if (!game) return false

    const jawaban = game.soal.jawaban
    const clue = jawaban.replace(/[bcdfghjklmnpqrstvwxyz]/gi, '_')

    conn.reply(
        m.chat,
        '```' + clue + '```',
        game.msg
    )
}

handler.command = /^who$/i
handler.limit = true

export default handler