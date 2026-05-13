let handler = async (m, { conn, args, usedPrefix }) => {
  const user = global.rpg.data.user[m.sender]
  const COOLDOWN = 30000
  const now = Date.now()

  if (!user) return conn.reply(m.chat, 'Kamu belum daftar', m)

  if (!args[0])
    return conn.reply(m.chat, help(usedPrefix), m)

  let type = args[0].toLowerCase()
  let amount = Number(args[1] || 1)

  if (isNaN(amount) || amount <= 0)
    return conn.reply(m.chat, 'Jumlah tidak valid', m)

  if (![1, 10, 100, 1000].includes(amount))
    return conn.reply(m.chat, 'Hanya support 1, 10, 100, 1000', m)

  let wait = COOLDOWN - (now - (user.lastopen || 0))
  if (wait > 0)
    return conn.reply(m.chat, `Mohon tunggu ${clockString(wait)} lagi`, m)

  let success = false

  switch (type) {
    case 'common':
      success = openCommon(user, amount, m, conn)
      break
    case 'uncommon':
      success = openUncommon(user, amount, m, conn)
      break
    case 'mythic':
      success = openMythic(user, amount, m, conn)
      break
    case 'legendary':
      success = openLegendary(user, amount, m, conn)
      break
    case 'boxs':
      success = openBoxs(user, amount, m, conn)
      break
    case 'gardenboxs':
      success = openGarden(user, amount, m, conn)
      break
    case 'cupon':
      success = openCupon(user, amount, m, conn)
      break
    case 'pet':
      success = openPet(user, m, conn)
      break
    default:
      return conn.reply(m.chat, help(usedPrefix), m)
  }

  if (success) user.lastopen = now
}

handler.help = ['open']
handler.tags = ['rpg']
handler.command = /^(open)$/i
handler.limit = true
handler.group = true
export default handler

/* =================== CRATE =================== */

function openCommon(u, n, m, conn) {
  if (u.common < n) {
    conn.reply(m.chat, 'Common crate tidak cukup', m)
    return false
  }

  let r = {
    money: rand(10, 50) * n,
    exp: rand(20, 100) * n,
    potion: rand(0, 3) * n,
    uncommon: rand(0, 1) * n,
    common: rand(0, 2) * n
  }

  u.common -= n
  give(u, r)
  conn.reply(m.chat, result('Common Crate', r), m)
  return true
}

function openUncommon(u, n, m, conn) {
  if (u.uncommon < n) {
    conn.reply(m.chat, 'Uncommon crate tidak cukup', m)
    return false
  }

  let r = {
    money: rand(50, 150) * n,
    exp: rand(100, 300) * n,
    potion: rand(0, 5) * n,
    diamond: rand(0, 2) * n,
    common: rand(0, 3) * n,
    uncommon: rand(0, 2) * n,
    mythic: roll(n, 10)
  }

  u.uncommon -= n
  give(u, r)
  conn.reply(m.chat, result('Uncommon Crate', r), m)
  return true
}

function openMythic(u, n, m, conn) {
  if (u.mythic < n) {
    conn.reply(m.chat, 'Mythic crate tidak cukup', m)
    return false
  }

  let r = {
    money: rand(200, 500) * n,
    exp: rand(300, 800) * n,
    potion: rand(1, 7) * n,
    diamond: rand(1, 5) * n,
    legendary: roll(n, 15)
  }

  u.mythic -= n
  give(u, r)
  conn.reply(m.chat, result('Mythic Crate', r), m)
  return true
}

function openLegendary(u, n, m, conn) {
  if (u.legendary < n) {
    conn.reply(m.chat, 'Legendary crate tidak cukup', m)
    return false
  }

  let r = {
    money: rand(500, 2000) * n,
    exp: rand(1000, 5000) * n,
    diamond: rand(5, 20) * n,
    potion: rand(3, 10) * n,
    pet: roll(n, 20)
  }

  u.legendary -= n
  give(u, r)
  conn.reply(m.chat, result('Legendary Crate', r), m)
  return true
}

function openBoxs(u, n, m, conn) {
  if (u.boxs < n) {
    conn.reply(m.chat, 'Boxs crate tidak cukup', m)
    return false
  }

  let r = {
    money: rand(100, 500) * n,
    exp: rand(200, 1000) * n,
    makananpet: rand(1, 5) * n,
    healtmonster: rand(1, 5) * n
  }

  u.boxs -= n
  give(u, r)
  conn.reply(m.chat, result('Boxs Crate', r), m)
  return true
}

function openGarden(u, n, m, conn) {
  if (u.gardenboxs < n) {
    conn.reply(m.chat, 'Gardenboxs tidak cukup', m)
    return false
  }

  let r = {
    bibitmangga: rand(10, 50) * n,
    bibitpisang: rand(10, 50) * n,
    bibitjeruk: rand(10, 50) * n,
    bibitapel: rand(10, 50) * n,
    bibitanggur: rand(10, 50) * n
  }

  u.gardenboxs -= n
  give(u, r)
  conn.reply(m.chat, result('Gardenboxs Crate', r), m)
  return true
}

function openCupon(u, n, m, conn) {
  if (u.cupon < n) {
    conn.reply(m.chat, 'Cupon crate tidak cukup', m)
    return false
  }

  let r = {
    money: 100000 * n,
    exp: 100000 * n,
    limit: 50 * n,
    bank: 50000 * n
  }

  u.cupon -= n
  give(u, r)
  conn.reply(m.chat, result('Cupon Crate', r), m)
  return true
}

function openPet(u, m, conn) {
  if (u.pet < 1) {
    conn.reply(m.chat, 'Pet crate tidak cukup', m)
    return false
  }

  u.pet -= 1

  let pets = ['kucing','rubah','kuda','serigala','naga','phonix','kyubi','centaur','griffin']
  let p = pick(pets)

  if (!u[p]) u[p] = 0

  if (u[p] > 0) {
    u.potion = (u.potion || 0) + 2
    u.makananpet = (u.makananpet || 0) + 3
    conn.reply(m.chat, `Sudah punya pet ${p}, diganti 2 potion + makanan pet`, m)
    return true
  }

  u[p] += 1
  conn.reply(m.chat, `Selamat kamu mendapatkan pet *${p}*`, m)
  return true
}

/* =================== UTIL =================== */

function give(u, r) {
  for (let k in r) {
    if (!u[k]) u[k] = 0
    u[k] += r[k]
  }
}

function result(name, r) {
  let txt = `Anda membuka *${name}* dan mendapatkan:`
  for (let k in r) if (r[k] > 0) txt += `\n• ${k}: ${r[k]}`
  return txt
}

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function roll(n, chancePercent) {
  let total = 0
  for (let i = 0; i < n; i++) {
    if (Math.random() * 100 < chancePercent) total++
  }
  return total
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function clockString(ms) {
  let m = Math.floor(ms / 60000) % 60
  let s = Math.floor(ms / 1000) % 60
  return `${m.toString().padStart(2,0)}:${s.toString().padStart(2,0)}`
}

function help(p) {
  return `${p}open <crate> <1|10|100|1000>

Crate:
• common
• uncommon
• mythic
• legendary
• boxs
• gardenboxs
• cupon
• pet`
}