import similarity from 'similarity'

const THRESHOLD = 0.72
let handler = m => m

handler.before = async function (m, { conn }) {
  const game = conn.tebaklogo?.[m.chat]

  if (m.fromMe) return true
  if (!game) return true

  // WAJIB reply ke soal
  if (!m.quoted || !m.text) return true

  // pastikan reply ke pesan soal
  if (m.quoted.id !== game.msg.key.id) return true

  const input = m.text.toLowerCase().trim()
  const jawaban = game.soal.jawaban.toLowerCase().trim()

  const user = global.rpg.data.user[m.sender]
  if (!user) return true

  // ✅ BENAR
  if (input === jawaban) {
    user.exp += game.point
    user.tiketcoin += game.tiket

    await m.reply(
      `*Benar!*\n+${game.point} XP\n+${game.tiket} TiketCoin`
    )

    clearTimeout(game.timer)
    await conn.sendMessage(m.chat, { delete: game.msg.key })
    delete conn.tebaklogo[m.chat]
    return true
  }

  // 🟡 HAMPIR
  if (similarity(input, jawaban) >= THRESHOLD) {
    m.reply('*Dikit lagi!*')
    return true
  }

  // ❌ SALAH
  m.reply('*Salah!*')
  return true
}

handler.exp = 0
export default handler