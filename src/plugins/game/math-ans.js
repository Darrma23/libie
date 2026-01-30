let handler = m => m

handler.before = async function (m, { conn }) {
    const game = conn.math?.[m.chat]
    if (!game) return true
    if (m.fromMe) return true

    // cuma nerima angka
    if (!m.text || !/^-?\d+(\.\d+)?$/.test(m.text)) return true

    // wajib reply ke pesan soal
    if (!m.quoted) return true
    if (m.quoted.id !== game.msg.id) return true

    const input = Number(m.text)
    const jawaban = Number(game.soal.result)

    const user = global.rpg.data.user[m.sender] ??= {
        exp: 0,
        tiketcoin: 0
    }

    // BENAR
    if (input === jawaban) {
        user.exp += game.point
        user.tiketcoin += game.tiket

        clearTimeout(game.timer)
        delete conn.math[m.chat]

        m.reply(
            `*Jawaban Benar!*\n+${game.point} XP\n+${game.tiket} TiketCoin`
        )
        return true
    }

    // SALAH
    game.chance--

    if (game.chance <= 0) {
        clearTimeout(game.timer)
        delete conn.math[m.chat]

        m.reply(
            `*Kesempatan habis!*\nJawaban: *${jawaban}*`
        )
        return true
    }

    m.reply(
        `*Jawaban Salah!*\nMasih ada ${game.chance} kesempatan`
    )
    return true
}

handler.exp = 0
export default handler