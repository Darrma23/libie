let handler = async (m, { conn, usedPrefix, participants }) => {
  conn.fight = conn.fight || {}

  if (conn.fight[m.sender]) {
    return m.reply('*Tidak bisa bertarung lagi karena kamu masih bertarung.*')
  }

  // ===== AMBIL USER GROUP =====
  let users = participants.map(u => u.id)
  let lawan

  do {
    lawan = users[Math.floor(Math.random() * users.length)]
  } while (
    lawan === m.sender ||
    !global.rpg?.data?.user?.[lawan]
  )

  let user = global.rpg.data.user[m.sender]
  let enemy = global.rpg.data.user[lawan]

  let lamaPertarungan = getRandom(5, 15)

  conn.fight[m.sender] = true

  const tagUser = '@' + m.sender.split('@')[0]
  const tagLawan = '@' + lawan.split('@')[0]

  // ===== START =====
  await conn.reply(
    m.chat,
`*${tagUser}* (Lv ${user.level})
VS
*${tagLawan}* (Lv ${enemy.level})

⚔️ Pertarungan dimulai!
⏳ Tunggu *${lamaPertarungan} menit*...`,
    m,
    { mentions: [m.sender, lawan] }
  )

  await delay(1000 * 60 * lamaPertarungan)

  let alasanKalah = ['Noob', 'Cupu', 'Kurang hebat', 'Ampas kalahan', 'Gembel kalahan']
  let alasanMenang = ['Hebat', 'Pro', 'Master Game', 'Legenda game', 'Sangat Pro', 'Rajin nge-push']

  // ===== SISTEM POIN =====
  let kesempatan = []
  for (let i = 0; i < user.level; i++) kesempatan.push(m.sender)
  for (let i = 0; i < enemy.level; i++) kesempatan.push(lawan)

  let pointUser = 0
  let pointEnemy = 0

  for (let i = 0; i < 10; i++) {
    let pick = kesempatan[getRandom(0, kesempatan.length - 1)]
    pick === m.sender ? pointUser++ : pointEnemy++
  }

  // ===== HASIL =====
  if (pointUser > pointEnemy) {
    let hadiah = (pointUser - pointEnemy) * 10000
    user.money += hadiah
    user.tiketcoin += 1

    await conn.reply(
      m.chat,
`*${tagUser}* [${pointUser * 10}] - [${pointEnemy * 10}] *${tagLawan}*

🏆 *MENANG*
Karena kamu ${alasanMenang[getRandom(0, alasanMenang.length - 1)]}

🎁 Hadiah:
💵 Rp ${hadiah.toLocaleString()}
🔖 +1 Tiketcoin`,
      m,
      { mentions: [m.sender, lawan] }
    )

  } else if (pointUser < pointEnemy) {
    let denda = (pointEnemy - pointUser) * 100000
    user.money = Math.max(0, user.money - denda)
    user.tiketcoin += 1

    await conn.reply(
      m.chat,
`*${tagUser}* [${pointUser * 10}] - [${pointEnemy * 10}] *${tagLawan}*

💀 *KALAH*
Karena kamu ${alasanKalah[getRandom(0, alasanKalah.length - 1)]}

⚠️ Hukuman:
💸 -Rp ${denda.toLocaleString()}
🔖 +1 Tiketcoin`,
      m,
      { mentions: [m.sender, lawan] }
    )

  } else {
    await conn.reply(
      m.chat,
`*${tagUser}* [${pointUser * 10}] - [${pointEnemy * 10}] *${tagLawan}*

⚖️ *IMBANG*
Ga dapet apa-apa.`,
      m,
      { mentions: [m.sender, lawan] }
    )
  }

  delete conn.fight[m.sender]
}

handler.help = ['fight']
handler.tags = ['rpg']
handler.command = /^(fight(ing)?)$/i
handler.limit = true
handler.group = true

export default handler

// ================= UTIL =================
function getRandom(min, max) {
  min = Math.ceil(min)
  max = Math.floor(max)
  return Math.floor(Math.random() * (max - min + 1)) + min
}

const delay = ms => new Promise(res => setTimeout(res, ms))