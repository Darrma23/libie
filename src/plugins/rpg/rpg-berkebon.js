const timeout = 1800000 // 30 menit

let handler = async (m, { conn, usedPrefix }) => {
  const user = global.rpg.data.user[m.sender]
  if (!user) return m.reply('User tidak terdaftar di database.')

  let {
    bibitapel,
    bibitanggur,
    bibitmangga,
    bibitpisang,
    bibitjeruk,
    lastberkebon
  } = user

  let time = lastberkebon + timeout

  if (
    bibitapel == 0 ||
    bibitanggur == 0 ||
    bibitmangga == 0 ||
    bibitpisang == 0 ||
    bibitjeruk == 0
  ) {
    return m.reply(
      `*Pastikan kamu memiliki semua bibit*\n` +
      `Bibit Apel, Mangga, Jeruk, Pisang, Anggur\n\n` +
      `Contoh beli:\n${usedPrefix}shop buy bibitmangga 500`
    )
  }

  if (Date.now() - lastberkebon < timeout) {
    return m.reply(
      `Anda sudah menanam.\n` +
      `Tunggu hasil panenmu selama ${msToTime(time - Date.now())} lagi`
    )
  }

  if (
    bibitmangga < 500 ||
    bibitapel < 500 ||
    bibitpisang < 500 ||
    bibitjeruk < 500 ||
    bibitanggur < 500
  ) {
    return m.reply(`Pastikan *setiap bibit minimal 500* untuk berkebon`)
  }

  // hasil panen
  let pisangpoin = Math.floor(Math.random() * 500)
  let anggurpoin = Math.floor(Math.random() * 500)
  let manggapoin = Math.floor(Math.random() * 500)
  let jerukpoin = Math.floor(Math.random() * 500)
  let apelpoin = Math.floor(Math.random() * 500)

  user.pisang += pisangpoin
  user.anggur += anggurpoin
  user.mangga += manggapoin
  user.jeruk += jerukpoin
  user.apel += apelpoin
  user.tiketcoin += 1

  user.bibitpisang -= 500
  user.bibitanggur -= 500
  user.bibitmangga -= 500
  user.bibitjeruk -= 500
  user.bibitapel -= 500

  user.lastberkebon = Date.now()

  m.reply(
    `🌱 *Hasil Berkebon*\n\n` +
    `+${pisangpoin} Pisang\n` +
    `+${manggapoin} Mangga\n` +
    `+${anggurpoin} Anggur\n` +
    `+${jerukpoin} Jeruk\n` +
    `+${apelpoin} Apel\n` +
    `+1 Tiketcoin`
  )

  setTimeout(() => {
    conn.reply(m.chat, `Waktunya berkebon lagi kak 😅`, m)
  }, timeout)
}

handler.help = ['berkebon']
handler.tags = ['rpg']
handler.command = /^(berkebon)$/i
handler.group = true
handler.limit = true

export default handler

function msToTime(ms) {
  let h = Math.floor(ms / 3600000)
  let m = Math.floor(ms / 60000) % 60
  let s = Math.floor(ms / 1000) % 60

  return `${h.toString().padStart(2, 0)} jam ` +
         `${m.toString().padStart(2, 0)} menit ` +
         `${s.toString().padStart(2, 0)} detik`
}