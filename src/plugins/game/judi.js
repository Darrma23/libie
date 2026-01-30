let handler = async (m, { conn, args, usedPrefix }) => {
  conn.judi = conn.judi || {}

  if (conn.judi[m.chat])
    return m.reply('Masih ada yang judi di sini, tunggu sampai selesai.')

  conn.judi[m.chat] = true

  try {
  	if (m.key.fromMe) return
  	
    const user = global.rpg.data.user[m.sender]
    if (!user) return m.reply('User tidak ditemukan.')

    // ===== COOLDOWN =====
    const last = user.judilast || 0
    const cooldown = 5000
    const now = Date.now()

    if (now - last < cooldown) {
      return m.reply(
        `Kamu sudah judi.\nTunggu ${clockString(cooldown - (now - last))} lagi.`
      )
    }

    // ===== VALIDASI INPUT =====
    if (!args[0])
      return m.reply(`${usedPrefix}judi <jumlah>\nContoh: ${usedPrefix}judi 1000`)

    let count =
      /all/i.test(args[0])
        ? user.money
        : parseInt(args[0])

    if (isNaN(count) || count < 1)
      return m.reply('Jumlah tidak valid.')

    if (user.money < count)
      return m.reply(`Money kamu tidak cukup untuk judi ${count}.`)

    // ===== SET COOLDOWN =====
    user.judilast = now
    user.money -= count

    // ===== ROLL =====
    let aku = Math.floor(Math.random() * 101)
    let kamu = Math.floor(Math.random() * 75) // emang niat bikin susah menang 😈

    let hasil = `🎲 *JUDI*\n\nAku roll: ${aku}\nKamu roll: ${kamu}\n\n`

    if (aku > kamu) {
      hasil += `❌ *Kalah*\nKamu kehilangan ${count} money`
    } else if (aku < kamu) {
      let win = count * 2
      user.money += win
      hasil += `✅ *Menang*\nKamu mendapatkan ${win} money`
    } else {
      user.money += count
      hasil += `⚖️ *Seri*\nMoney kamu kembali ${count}`
    }

    await m.reply(hasil)

  } catch (e) {
    console.error(e)
    m.reply('Terjadi error saat judi.')
  } finally {
    delete conn.judi[m.chat]
  }
}

handler.help = ['judi']
handler.tags = ['game']
handler.command = /^(judi)$/i
handler.limit = true
handler.group = true

export default handler

function clockString(ms) {
  let s = Math.floor(ms / 1000)
  let m = Math.floor(s / 60)
  let h = Math.floor(m / 60)
  s %= 60
  m %= 60
  return [h, m, s].map(v => v.toString().padStart(2, 0)).join(':')
}