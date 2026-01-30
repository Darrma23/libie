const timeout = 28800000 // 8 jam

let handler = async (m, { conn }) => {
  let users = global.rpg.data.user
  let u = users[m.sender]

  if (!u) return m.reply('Data kamu belum terdaftar')

  // ===== INIT FIELD =====
  if (typeof u.lastnambang !== 'number') u.lastnambang = 0
  if (typeof u.emas !== 'number') u.emas = 0
  if (typeof u.diamond !== 'number') u.diamond = 0
  if (typeof u.tiketcoin !== 'number') u.tiketcoin = 0

  let now = Date.now()

  // ===== COOLDOWN =====
  if (now - u.lastnambang < timeout) {
    let sisa = msToTime(u.lastnambang + timeout - now)
    return m.reply(
      `⛏️ Kamu sudah menambang\nTunggu *${sisa}* lagi`
    )
  }

  // ===== HASIL NAMBANG =====
  let emas = Math.floor(Math.random() * 4)
  let diamond = Math.floor(Math.random() * 3)

  u.emas += emas
  u.diamond += diamond
  u.tiketcoin += 1
  u.lastnambang = now

  m.reply(
    `⛏️ *HASIL PENAMBANGAN*\n\n` +
    `+${emas} Emas\n` +
    `+${diamond} Diamond\n\n` +
    `+1 Tiketcoin`
  )

  // reminder (opsional)
  setTimeout(() => {
    conn.reply(m.chat, 'Waktunya nambang lagi kak 😅', m)
  }, timeout)
}

handler.help = ['nambang']
handler.tags = ['rpg']
handler.command = /^(nambang)$/i
handler.group = true
handler.limit = true

export default handler

function msToTime(ms) {
  let h = Math.floor(ms / 3600000)
  let m = Math.floor(ms / 60000) % 60
  let s = Math.floor(ms / 1000) % 60
  return `${h} jam ${m} menit ${s} detik`
}