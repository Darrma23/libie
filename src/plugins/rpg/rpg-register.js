let handler = async (m) => {
  const user = global.rpg.data.user[m.sender]
  if (!user) return m.reply("User tidak ditemukan.")

  // sudah daftar
  if (user.registered) {
    return m.reply("Kamu sudah terdaftar.")
  }

  // proses daftar
  user.registered = true
  user.reg_time = Date.now()

  // bonus awal
  user.user_limit += 20
  user.money += 500
  user.exp += 10

  await m.reply(
    `✅ *Pendaftaran Berhasil!*\n\n` +
    `🎁 Bonus awal:\n` +
    `• Limit +20\n` +
    `• Money +500\n` +
    `• Exp +10\n\n` +
    `Selamat bermain 🎮`
  )
}

handler.help = ['daftar']
handler.tags = ['rpg']
handler.command = /^(daftar|register)$/i

export default handler