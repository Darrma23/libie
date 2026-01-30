const timeout = 3600000 // 1 jam

let handler = async (m, { conn, usedPrefix }) => {
  let users = global.rpg.data.user
  let u = users[m.sender]

  if (!u) return m.reply('Data kamu belum terdaftar')

  // ===== INIT FIELD =====
  if (typeof u.aqua !== 'number') u.aqua = 0
  if (typeof u.wood !== 'number') u.wood = 0
  if (typeof u.tiketcoin !== 'number') u.tiketcoin = 0
  if (typeof u.lastnebang !== 'number') u.lastnebang = 0

  let now = Date.now()

  // ===== CEK AQUA =====
  if (u.aqua < 10) {
    return m.reply(
      `💧 Aqua kamu kurang\n` +
      `Minimal *10 Aqua* untuk nebang\n\n` +
      `Beli aqua:\n${usedPrefix}shop buy aqua 10`
    )
  }

  // ===== COOLDOWN =====
  if (now - u.lastnebang < timeout) {
    let sisa = msToTime(u.lastnebang + timeout - now)
    return m.reply(
      `🪓 Kamu sudah menebang pohon\n` +
      `Tunggu *${sisa}* lagi`
    )
  }

  // ===== HASIL NEBANG =====
  let kayu = Math.floor(Math.random() * 1000) + 1
  let aquaHabis = Math.floor(Math.random() * 5) + 1

  if (aquaHabis > u.aqua) aquaHabis = u.aqua

  u.wood += kayu
  u.aqua -= aquaHabis
  u.tiketcoin += 1
  u.lastnebang = now

  m.reply(
    `🪓 *HASIL NEBANG*\n\n` +
    `+${kayu} Kayu\n` +
    `+1 Tiketcoin\n\n` +
    `💧 Aqua berkurang: -${aquaHabis}\n` +
    `Sisa Aqua: ${u.aqua}`
  )

  // reminder (opsional)
  setTimeout(() => {
    conn.reply(m.chat, 'Waktunya nebang pohon lagi kak 😅', m)
  }, timeout)
}

handler.help = ['nebang']
handler.tags = ['rpg']
handler.command = /^(nebang)$/i
handler.group = true
handler.limit = true

export default handler

function msToTime(ms) {
  let h = Math.floor(ms / 3600000)
  let m = Math.floor(ms / 60000) % 60
  let s = Math.floor(ms / 1000) % 60
  return `${h} jam ${m} menit ${s} detik`
}