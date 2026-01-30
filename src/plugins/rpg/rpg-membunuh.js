let handler = async (m, { conn, usedPrefix }) => {
  let users = global.rpg.data.user
  let sender = m.sender

  // ===== VALIDASI TARGET =====
  let target
  if (m.isGroup) target = m.mentionedJid[0]
  else target = m.chat

  if (!target) return m.reply('Tag salah satu orangnya')
  if (!users[target]) return m.reply('Target tidak ada di database')
  if (target === sender) return m.reply('Niat amat mau bunuh diri')

  // ===== INIT FIELD BIAR AMAN =====
  if (typeof users[sender].lastbunuhi !== 'number') users[sender].lastbunuhi = 0
  if (typeof users[target].health !== 'number') users[target].health = 100
  if (typeof users[target].money !== 'number') users[target].money = 0
  if (typeof users[sender].money !== 'number') users[sender].money = 0

  // ===== COOLDOWN 1 JAM =====
  let cooldown = 3600000
  let time = users[sender].lastbunuhi + cooldown

  if (Date.now() - users[sender].lastbunuhi < cooldown) {
    return m.reply(
      `Lu baru aja bunuh orang.\nTunggu ${clockString(time - Date.now())} lagi`
    )
  }

  // ===== CEK KONDISI TARGET =====
  if (users[target].health < 10)
    return m.reply('Target sudah sekarat')

  if (users[target].money < 100)
    return m.reply('Target miskin, gak ada yang bisa diambil')

  // ===== HASIL RANDOM =====
  let damage = Math.floor(Math.random() * 50) + 10 // 10–59
  let loot = Math.floor(Math.random() * 50000) + 100 // 100–50100

  if (loot > users[target].money) loot = users[target].money

  // ===== EKSEKUSI =====
  users[target].health -= damage
  if (users[target].health < 0) users[target].health = 0

  users[target].money -= loot
  users[sender].money += loot

  users[sender].lastbunuhi = Date.now()

  m.reply(
    `
☠️ *PEMBUNUHAN BERHASIL*

Target: @${target.split('@')[0]}
Damage: -${damage} Health
Uang dirampas: ${loot} Money

Sisa Health Target: ${users[target].health}
`.trim(),
    null,
    { mentions: [target] }
  )
}

handler.help = ['membunuh']
handler.tags = ['rpg']
handler.command = /^membunuh$/i
handler.limit = true
handler.group = true

export default handler

function clockString(ms) {
  let h = Math.floor(ms / 3600000)
  let m = Math.floor(ms / 60000) % 60
  let s = Math.floor(ms / 1000) % 60
  return `${h} jam ${m} menit ${s} detik`
}