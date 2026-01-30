let handler = async (m, { conn }) => {
    conn.asahotak ??= {}
    const game = conn.asahotak[m.chat]
    if (!game) return false

    const jawaban = game.soal.jawaban
    const clue = jawaban.replace(/[bcdfghjklmnpqrstvwxyz]/gi, '_')

    m.reply('```' + clue + '```')
}

handler.command = /^ao$/i
handler.limit = true

export default handler