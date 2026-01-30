let handler = async (m, { conn, usedPrefix }) => {
  let users = global.rpg.data.user
  let sender = m.sender

  // ===== VALIDASI TARGET =====
  let target
  if (m.isGroup) target = m.mentionedJid[0]
  else target = m.chat

  if (!target) return m.reply('Tag salah satu orangnya')
  if (!users[target]) return m.reply('Target tidak ada di database')
  if (target === sender) return m.reply('Lu mau ngerampok diri sendiri?')

  // ===== INIT BIAR AMAN =====
  if (typeof users[sender].lastrob !== 'number') users[sender].lastrob = 0
  if (typeof users[target].money !== 'number') users[target].money = 0
  if (typeof users[sender].money !== 'number') users[sender].money = 0

  // ===== COOLDOWN 1 JAM =====
  let cooldown = 3600000
  let time = users[sender].lastrob + cooldown

  if (Date.now() - users[sender].lastrob < cooldown) {
    return m.reply(
      `Lu baru aja ngerampok.\nTunggu ${clockString(time - Date.now())} lagi`
    )
  }

  // ===== CEK DUIT TARGET =====
  if (users[target].money < 10000)
    return m.reply('Target miskin, gak ada yang bisa dirampok')

  // ===== HASIL RANDOM =====
  let loot = Math.floor(Math.random() * 100000)
  if (loot > users[target].money) loot = users[target].money

  // ===== EKSEKUSI =====
  users[target].money -= loot
  users[sender].money += loot
  users[sender].lastrob = Date.now()

  conn.reply(
    m.chat,
    `
💰 *PERAMPOKAN BERHASIL*

Target: @${target.split('@')[0]}
Uang dirampas: ${loot} Money
`.trim(),
    m,
    { mentions: [target] }
  )
}

handler.help = ['merampok']
handler.tags = ['rpg']
handler.command = /^merampok$/i
handler.limit = true
handler.group = true

export default handler

function clockString(ms) {
  let h = Math.floor(ms / 3600000)
  let m = Math.floor(ms / 60000) % 60
  let s = Math.floor(ms / 1000) % 60
  return `${h} jam ${m} menit ${s} detik`
}