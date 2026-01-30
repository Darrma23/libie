let handler = async (m, { text }) => {
  const user = global.rpg.data.user[m.sender]
  if (!user) return m.reply("User tidak ditemukan.")

  if (!user.registered) {
    return m.reply("Kamu belum terdaftar.")
  }

  if (text !== "yes") {
    return m.reply(
      `⚠️ *PERINGATAN*\n\n` +
      `Unregister akan menghapus:\n` +
      `• Data RPG\n` +
      `• Level & EXP\n` +
      `• Money & Limit\n\n` +
      `Ketik:\n` +
      `*.unreg yes*\n` +
      `untuk melanjutkan.`
    )
  }

  // RESET DATA RPG PENTING
  user.registered = false
  user.reg_time = 0
  user.name = ""
  user.age = -1

  user.level = 1
  user.exp = 0
  user.money = 0
  user.user_limit = 0

  user.role = "Beginner"

  await m.reply(
    `✅ *Unregister berhasil*\n\n` +
    `Semua data RPG kamu telah dihapus.\n` +
    `Kalau nyesel, itu urusan hidup kamu sendiri.\n\n` +
    `Gunakan *.daftar* untuk mulai ulang.`
  )
}

handler.help = ["unreg"]
handler.tags = ["rpg"]
handler.command = /^unreg(ister)?$/i
handler.register = true

export default handler