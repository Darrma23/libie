import similarity from 'similarity'

const threshold = 0.72

export async function before(m, { conn }) {
  if (!m.text) return
  if (m.key?.fromMe) return

  conn.caklontong = conn.caklontong || {}
  let id = m.chat

  // ga ada soal aktif
  if (!(id in conn.caklontong)) return

  let [msg, json, timeoutId] = conn.caklontong[id]

  // OPTIONAL: hanya respon kalau reply ke soal
  if (m.quoted && m.quoted.id !== msg.id) return

  let answer = json.jawaban.toLowerCase().trim()
  let text = m.text.toLowerCase().trim()

  let user = global.rpg.data.user[m.sender]
  if (!user) return

  // ===== BENAR =====
  if (text === answer) {
    user.exp += 500
    user.tiketcoin += 1

    conn.reply(
      m.chat,
      `✅ *Benar!*\n+500 XP\n+1 🎟️ Tiketcoin\n\n${json.deskripsi}`,
      msg
    )

    clearTimeout(timeoutId)
    delete conn.caklontong[id]
    return
  }

  // ===== MIRIP =====
  if (similarity(text, answer) >= threshold) {
    return m.reply('*Dikit lagi!*')
  }

  // ===== SALAH =====
  return m.reply('*Salah!*')
}