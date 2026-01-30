let handler = async (m, { conn }) => {
    conn.lengkapikalimat ??= {}
    const game = conn.lengkapikalimat[m.chat]
    if (!game) return false

    const jawaban = game.soal.jawaban.trim()
    const clue = jawaban.replace(/[AIUEOaiueo]/g, '_')

    conn.reply(
        m.chat,
        '```' + clue + '```',
        game.msg
    )
}

handler.command = /^leka$/i
handler.limit = true

export default handler