let handler = async (m, { conn, args, usedPrefix }) => {
  let u = global.rpg.data.user[m.sender]

  if (!args[0]) {
    return conn.reply(m.chat, `Contoh:\n${usedPrefix}kill monster`, m)
  }

  if (args[0] !== 'monster') {
    return conn.reply(m.chat, `Command salah!\nContoh: ${usedPrefix}kill monster`, m)
  }

  // ===== INIT FIELD BIAR AMAN =====
  if (typeof u.user_limit !== 'number') u.user_limit = 0
  if (typeof u.lastwarpet !== 'number') u.lastwarpet = 0
  if (typeof u.healtmonster !== 'number') u.healtmonster = 100

  // ===== COOLDOWN 2 JAM =====
  let cooldown = 7200000
  let time = u.lastwarpet + cooldown
  if (Date.now() - u.lastwarpet < cooldown) {
    throw `Kamu baru saja bertarung.\nSiap lagi dalam ${msToTime(time - Date.now())}`
  }

  // ===== SYARAT =====
  if (u.health < 80) {
    return conn.reply(
      m.chat,
      `Minimal 80 health untuk bertarung.\nGunakan potion dulu.`,
      m
    )
  }

  if (u.healtmonster < 100) u.healtmonster = 100

  // ===== DAMAGE =====
  let damagePlayer = pickRandom([20,21,22,23,24,25,26,27,28,29,30])
  let damageMonster = pickRandom([30,31,32,33,34,35,36,37,38,39,40])

  u.health -= damagePlayer
  u.healtmonster -= damageMonster

  // ===== PLAYER KALAH =====
  if (u.health <= 0) {
    u.health = 1
    u.lastwarpet = Date.now()
    return conn.reply(
      m.chat,
      `💀 Kamu tumbang dan terpaksa mundur.\nCoba lagi nanti.`,
      m
    )
  }

  // ===== MONSTER KALAH =====
  if (u.healtmonster <= 0) {
    u.healtmonster = 100
  }

  // ===== REWARD =====
  let exp = Math.floor(Math.random() * 100000)
  let money = Math.floor(Math.random() * 100000)
  let limit = Math.floor(Math.random() * 10)
  let potion = Math.floor(Math.random() * 2)
  let boxs = Math.floor(Math.random() * 5)
  let pet = Math.floor(Math.random() * 2)
  let legendary = Math.floor(Math.random() * 2)

  u.exp += exp
  u.money += money
  u.user_limit += limit
  u.potion += potion
  u.boxs += boxs
  u.pet += pet
  u.legendary += legendary
  u.tiketcoin += 1
  u.lastwarpet = Date.now()

  let monsters = [
    'Bat Eagle Monster',
    'Biggest Rhino Monster',
    'Biggest Mole Monster',
    'Metal Monster Legend',
    'Legend Of The Octopus Monster',
    'Legend Of The Larva Monster'
  ]

  let monster = pickRandom(monsters)

  let result = `
⚔️ *PERTEMPURAN SELESAI*

Monster: *${monster}*
Damage diterima: -${damagePlayer}
Health tersisa: ${u.health}

🎁 *Hadiah*
+${exp} Exp
+${money} Money
+${limit} Limit
+${potion} Potion
+${boxs} Box
+${pet} Pet
+1 Tiketcoin
${legendary ? '+1 Legendary Crate' : ''}
`.trim()

  conn.reply(m.chat, result, m)
}

handler.help = ['kill monster']
handler.tags = ['rpg']
handler.command = /^(kill)$/i
handler.limit = true
handler.group = true

export default handler

function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)]
}

function msToTime(ms) {
  let s = Math.floor(ms / 1000) % 60
  let m = Math.floor(ms / 60000) % 60
  let h = Math.floor(ms / 3600000)
  return `${h} jam ${m} menit ${s} detik`
}