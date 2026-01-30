import similarity from 'similarity'

const THRESHOLD = 0.72
let handler = m => m

handler.before = async function (m, { conn }) {
    const game = conn.asahotak?.[m.chat]
    if (m.fromMe) return true
    
    if (!game) return true

    // WAJIB REPLY
    if (!m.quoted) return true
    if (!m.text) return true


    const input = m.text.toLowerCase().trim()
    const jawaban = game.soal.jawaban.toLowerCase().trim()

    const user = global.rpg.data.user[m.sender]

    // BENAR
    if (input === jawaban) {
        user.exp += game.point
        user.tiketcoin += game.tiket

        m.reply(
            `*Benar!*\n+${game.point} XP\n+${game.tiket} TiketCoin`
        )

        clearTimeout(game.timer)
        delete conn.asahotak[m.chat]
        return true
    }

    // HAMPIR
    if (similarity(input, jawaban) >= THRESHOLD) {
        m.reply('*Dikit lagi!*')
        return true
    }

    // SALAH
    m.reply('*Salah!*')
    return true
}

handler.exp = 0
export default handler