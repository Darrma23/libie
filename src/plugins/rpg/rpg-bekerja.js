const COOLDOWN = 86400000 // 24 jam

let handler = async (m, { conn, args, usedPrefix, command }) => {
  let day = parseInt(args[0])
  if (!day || day < 1 || day > 30) {
    return conn.reply(
      m.chat,
      `${usedPrefix + command} [1-30]\nContoh: *${usedPrefix + command} 1*`,
      m
    )
  }

  let u = global.rpg.data.user[m.sender]
  let now = Date.now()

  // basic check
  if (u.aqua < 5) return m.reply('Aqua tidak cukup, minimal aqua 5')
  if (u.health < 90) return m.reply('Health tidak cukup, minimal health 90')

  // cooldown
  if (now - u.lastpekerjaan < COOLDOWN) {
    let sisa = clockString(COOLDOWN - (now - u.lastpekerjaan))
    return m.reply(`Kamu sudah absen, tunggu ${sisa} lagi`)
  }

  // cek hari sebelumnya
  if (day > 1) {
    let prevKey = `kerja${numberToWord(day - 1)}`
    if ((u[prevKey] || 0) < 2) {
      return m.reply(`Kamu tidak absen hari ke ${day - 1}`)
    }
    u[prevKey] -= 2
  }

  // reward
  let healing = rand(0, 100)
  let exp = day === 30 ? rand(0, 10000) : rand(0, 1000)
  let money = day === 30 ? rand(0, 1000000) : rand(0, 10000)

  u.health -= healing
  u.exp += exp
  u.money += money
  u.aqua -= 5
  u.tiketcoin += day === 30 ? 5 : 1

  if (day === 30) u.cupon += 2
  else {
    let nextKey = `kerja${numberToWord(day)}`
    u[nextKey] = (u[nextKey] || 0) + 2
  }

  u.lastpekerjaan = now

  let msg = `Selamat kamu sudah bekerja keras dan mendapatkan:
+${money} Money
+${exp} Exp
+${day === 30 ? '+2 Cupon\n+5 Tiketcoin' : '+1 Tiketcoin'}

health dan aqua mu berkurang
-${healing} Health
-5 Aqua

Jangan lupa absen besok 😄`

  conn.reply(m.chat, msg.trim(), m)
}

handler.help = ['bekerja']
handler.tags = ['rpg']
handler.command = /^(bekerja)$/i
handler.limit = true
handler.group = true

export default handler

// ===== helper =====
function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function clockString(ms) {
  let h = Math.floor(ms / 3600000)
  let m = Math.floor(ms / 60000) % 60
  let s = Math.floor(ms / 1000) % 60
  return [h, m, s].map(v => v.toString().padStart(2, 0)).join(':')
}

function numberToWord(n) {
  return [
    'satu','dua','tiga','empat','lima','enam','tujuh','delapan','sembilan','sepuluh',
    'sebelas','duabelas','tigabelas','empatbelas','limabelas','enambelas','tujuhbelas',
    'delapanbelas','sembilanbelas','duapuluh','duasatu','duadua','duatiga','duaempat',
    'dualima','duaenam','duatujuh','duadelapan','duasembilan'
  ][n - 1]
}