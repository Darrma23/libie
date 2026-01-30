let handler = async (m, { conn, usedPrefix }) => {
  try {
    const u = global.rpg.data.user[m.sender]
    if (!u) return

    // ===== SAFE INIT (ANTI UNDEFINED) =====
    u.health ??= 100
    u.exp ??= 0
    u.money ??= 0
    u.lastadventure ??= 0
    u.tiketcoin ??= 0
    u.potion ??= 0
    u.diamond ??= 0
    u.common ??= 0
    u.uncommon ??= 0
    u.sampah ??= 0
    u.mythic ??= 0
    u.legendary ??= 0

    const now = Date.now()
    const cooldown = 3600000
    const diff = now - u.lastadventure
    const remaining = cooldown - diff
    const timers = clockString(remaining)

    // ===== CEK HEALTH =====
    if (u.health < 80) {
      return conn.reply(
        m.chat,
        `Minimal 80 health untuk bisa berpetualang.\n` +
        `Beli potion: *${usedPrefix}shop buy potion <jumlah>*\n` +
        `Gunakan potion: *${usedPrefix}use potion <jumlah>*`,
        m
      )
    }

    // ===== COOLDOWN =====
    if (diff < cooldown) {
      return conn.reply(
        m.chat,
        `Anda sudah berpetualang dan kelelahan.\nCoba lagi dalam *${timers}*`,
        m
      )
    }

    // ===== RANDOM REWARD =====
    const healthLost = Math.floor(Math.random() * 100) + 1
    const exp = Math.floor(Math.random() * 10000)
    const uang = Math.floor(Math.random() * 100000)
    const potion = pickRandom([1, 2, 3])
    const sampah = Math.floor(Math.random() * 50) + 1
    const diamond = Math.floor(Math.random() * 10) + 1
    const common = pickRandom([1, 2, 3])
    const uncommon = pickRandom([1, 2])
    const mythic = pickRandom([1, 1, 2, 3])
    const legendary = pickRandom([1, 1, 2, 3])

    const places = [
      { img: 'https://telegra.ph/file/3db18ece1f08a5cf0a086.jpg', tempat: 'Beautiful Green Forest Waterfall' },
      { img: 'https://telegra.ph/file/545ab458c7379b2684516.jpg', tempat: 'Blue Aurora Forest' },
      { img: 'https://telegra.ph/file/5d2d177294db36754ae40.jpg', tempat: 'Dragon Valley Forest' },
      { img: 'https://telegra.ph/file/f6b6b772fe6c4c2c3da29.jpg', tempat: 'Fairy Secret Forest' },
      { img: 'https://telegra.ph/file/a51bdd96267412d60b8ec.jpg', tempat: 'Light In The Dark Forest' },
      { img: 'https://telegra.ph/file/40e2c1ccaf1ccf7a89057.jpg', tempat: 'Dim Light Forest' }
    ]

    const loc = pickRandom(places)

    const rareMsg = pickRandom([
      `*Selamat!*\nKamu mendapatkan *${mythic} Mythic Crate*`,
      `*Selamat!*\nKamu mendapatkan *${legendary} Legendary Crate*`
    ])

    const text = `
Nyawa mu berkurang -${healthLost}
Karena kamu berpetualang ke:
*${loc.tempat}*

Kamu mendapatkan:
*Exp:* ${exp}
*Uang:* ${uang}
*Tiketcoin:* 1
*Sampah:* ${sampah}
*Potion:* ${potion}
*Diamond:* ${diamond}
*Common Crate:* ${common}
*Uncommon Crate:* ${uncommon}
`.trim()

    await conn.sendMessage(m.chat, { text }, { quoted: m })
    setTimeout(() => conn.reply(m.chat, rareMsg, m), 3000)

    // ===== APPLY KE SQLITE VIA PROXY =====
    u.health -= healthLost
    u.exp += exp
    u.money += uang
    u.tiketcoin += 1
    u.potion += potion
    u.diamond += diamond
    u.common += common
    u.uncommon += uncommon
    u.sampah += sampah
    u.mythic += mythic
    u.legendary += legendary
    u.lastadventure = now

  } catch (e) {
    console.error(e)
    throw e
  }
}

handler.help = ['adventure']
handler.tags = ['rpg']
handler.command = /^(adventure)$/i
handler.limit = true
handler.group = true

export default handler

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function clockString(ms) {
  if (ms <= 0) return '00:00:00'
  const h = Math.floor(ms / 3600000)
  const m = Math.floor(ms / 60000) % 60
  const s = Math.floor(ms / 1000) % 60
  return [h, m, s].map(v => v.toString().padStart(2, '0')).join(':')
}