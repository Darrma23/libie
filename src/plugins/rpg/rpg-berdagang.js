let handler = async (m, { conn }) => {
  const users = global.rpg.data.user
  const me = users[m.sender]

  if (!me) return

  // ===== TARGET =====
  let who = m.isGroup ? m.mentionedJid[0] : m.chat
  if (!who) return m.reply('Tag salah satu lah, yang mau berdagang bareng')
  if (!users[who]) return m.reply('Pengguna tidak ada di database')

  const target = users[who]

  // ===== INIT AMAN =====
  me.money ??= 0
  target.money ??= 0
  me.lastdagang ??= 0

  // ===== COOLDOWN 8 JAM =====
  const cooldown = 28800000
  const now = Date.now()
  const diff = now - me.lastdagang

  if (diff < cooldown) {
    return m.reply(`Anda sudah berdagang.\nTunggu *${clockString(cooldown - diff)}* lagi`)
  }

  // ===== MODAL =====
  if (me.money < 5000) return m.reply('Kamu tidak punya modal minimal 5000')
  if (target.money < 5000) return m.reply('Target tidak punya modal minimal 5000')

  // ===== MODAL RANDOM =====
  const modal = Math.floor(Math.random() * 5000)

  me.money -= modal
  target.money -= modal

  conn.reply(
    m.chat,
    `Mohon tunggu...\n` +
    `Kamu dan @${who.split('@')[0]} sedang berdagang 🧾\n\n` +
    `Modal dikeluarkan: -${modal}`,
    m,
    { mentions: [who] }
  )

  // ===== TOTAL HASIL (SAMA KAYAK KODE LU) =====
  // 7x 5000 + 1x 10000 = 45000
  const hasil = 45000

  me.money += hasil
  target.money += hasil
  me.lastdagang = now

  setTimeout(() => {
    conn.reply(
      m.chat,
      `📦 *Perdagangan Selesai!*\n\n` +
      `Kamu mendapat +${hasil} Money\n` +
      `Total Money kamu: *${me.money}*\n\n` +
      `@${who.split('@')[0]} mendapat +${hasil} Money\n` +
      `Total Money dia: *${target.money}*`,
      m,
      { mentions: [who] }
    )
  }, 3000)
}

handler.help = ['berdagang']
handler.tags = ['rpg']
handler.command = /^berdagang$/i
handler.limit = true
handler.group = true

export default handler

function clockString(ms) {
  if (ms <= 0) return '00:00:00'
  const h = Math.floor(ms / 3600000)
  const m = Math.floor(ms / 60000) % 60
  const s = Math.floor(ms / 1000) % 60
  return [h, m, s].map(v => v.toString().padStart(2, '0')).join(':')
}