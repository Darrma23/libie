let handler = async (m, { conn }) => {
  let users = global.rpg.data.user
  let u = users[m.sender]

  if (!u) return m.reply('Data kamu belum terdaftar')

  // ===== INIT FIELD (WAJIB) =====
  if (typeof u.lastmulung !== 'number') u.lastmulung = 0
  if (typeof u.botol !== 'number') u.botol = 0
  if (typeof u.kaleng !== 'number') u.kaleng = 0
  if (typeof u.kardus !== 'number') u.kardus = 0

  // ===== COOLDOWN 30 MENIT =====
  let cooldown = 1800000
  let now = Date.now()

  if (now - u.lastmulung < cooldown) {
    let sisa = msToTime(u.lastmulung + cooldown - now)
    return m.reply(
      `Kamu capek abis mulung 😮‍💨\nTunggu *${sisa}* lagi`
    )
  }

  // ===== HASIL MULUNG =====
  let botol = Math.floor(Math.random() * 1000)
  let kaleng = Math.floor(Math.random() * 1000)
  let kardus = Math.floor(Math.random() * 1000)

  u.botol += botol
  u.kaleng += kaleng
  u.kardus += kardus
  u.lastmulung = now

  m.reply(
    `🗑️ *HASIL MULUNG*\n\n` +
    `+${botol} Botol\n` +
    `+${kaleng} Kaleng\n` +
    `+${kardus} Kardus`
  )

  // reminder (opsional, lu boleh hapus)
  setTimeout(() => {
    conn.reply(m.chat, 'Yuk waktunya mulung lagi 😅', m)
  }, cooldown)
}

handler.help = ['mulung']
handler.tags = ['rpg']
handler.command = /^(mulung)$/i
handler.limit = true
handler.group = true

export default handler

function msToTime(ms) {
  let h = Math.floor(ms / 3600000)
  let m = Math.floor(ms / 60000) % 60
  let s = Math.floor(ms / 1000) % 60
  return `${h} jam ${m} menit ${s} detik`
}