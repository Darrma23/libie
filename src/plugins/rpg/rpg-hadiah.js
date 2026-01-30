const miningxp = 5000
const miningmoney = 5000
const mininguser_limit = 10
const timeout = 3600000 // 1 jam

let handler = async (m, { conn }) => {
  const user = global.rpg.data.user[m.sender]
  if (!user) return m.reply('User tidak ditemukan.')

  const now = Date.now()
  const last = user.lastmining || 0
  const remaining = timeout - (now - last)

  // ===== COOLDOWN =====
  if (remaining > 0) {
    return m.reply(
      `Anda sudah mengambil hadiah.\n` +
      `Tunggu ${msToTime(remaining)} lagi.`
    )
  }

  // ===== HITUNG REWARD =====
  const xp = Math.floor(Math.random() * miningxp) + 500
  const money = Math.floor(Math.random() * miningmoney) + 500
  const user_limit = Math.floor(Math.random() * mininguser_limit) + 1

  // ===== PAJAK (AMAN) =====
  const taxXp = 500
  const taxMoney = 500

  // ===== APPLY =====
  user.exp += xp - taxXp
  user.money += money - taxMoney
  user.user_limit += user_limit
  user.lastmining = now

  await m.reply(
    `⛏️ *MINING HADIAH*\n\n` +
    `+${xp} XP\n` +
    `+${money} Money\n` +
    `+${user_limit} limit\n\n` +
    `🧾 Pajak:\n` +
    `-500 XP\n` +
    `-500 Money`
  )
}

handler.help = ['hadiah']
handler.tags = ['rpg']
handler.command = /^(hadiah)$/i
handler.user_limit = true

export default handler

function msToTime(ms) {
  let h = Math.floor(ms / 3600000)
  let m = Math.floor(ms / 60000) % 60
  let s = Math.floor(ms / 1000) % 60
  return [h, m, s].map(v => v.toString().padStart(2, '0')).join(':')
}