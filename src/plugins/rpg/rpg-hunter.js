let handler = async (m, { conn }) => {
  const user = global.rpg.data.user[m.sender]
  const COOLDOWN = 1200000 // 20 menit
  const now = Date.now()

  const monsters = [
    { name: "Spider Dragon", img: "https://telegra.ph/file/cb254df6391057afb1d61.jpg" },
    { name: "Long Neck Dragon", img: "https://telegra.ph/file/aeda94211d958f0726020.jpg" },
    { name: "Green Snake Dragon", img: "https://telegra.ph/file/8504645f09237ee51aa55.jpg" },
    { name: "Blue Wolf Dragon", img: "https://telegra.ph/file/0ad92a47597f21a0182a2.jpg" },
    { name: "Thorny Tirex Dragon", img: "https://telegra.ph/file/b172e3031b3fd672673bd.jpg" },
    { name: "Blue Rhino Dragon", img: "https://telegra.ph/file/6c78ce26c800699f6888b.jpg" },
    { name: "Red Rhino Dragon", img: "https://telegra.ph/file/226e31d67ca326957dcd8.jpg" },
    { name: "Blue Tirex Dragon", img: "https://telegra.ph/file/51ca0b2a5b72a7af4e135.jpg" },
    { name: "The Biggest Dragon", img: "https://telegra.ph/file/a183b170a6a94d6e76008.jpg" },
    { name: "Biggest Wing Dragon", img: "https://telegra.ph/file/cfc96314d366e4aaf35b1.jpg" },
    { name: "Blue Bat Dragon", img: "https://telegra.ph/file/5559a40b7abd7ecb6a46e.jpg" },
    { name: "Big Monster Dragon", img: "https://telegra.ph/file/fc78472a020c403e95bc0.jpg" },
    { name: "King Spider Dragon", img: "https://telegra.ph/file/bc00a563c119cf37beb6a.jpg" },
    { name: "Blue Ice Dragon", img: "https://telegra.ph/file/842bb589be0d7288a8e26.jpg" },
    { name: "Legendary Dragon", img: "https://telegra.ph/file/54643ffdb12e35e88a6b1.jpg" }
  ]

  let wait = COOLDOWN - (now - (user.lasthunt || 0))
  if (wait > 0)
    return m.reply(`Tunggu *${clockString(wait)}* untuk berburu lagi`)

  if (user.health < 20)
    return m.reply('Health kamu terlalu rendah. Heal dulu.')

  let monster = pick(monsters)
  let damage = rand(20, 100)
  let rewardMoney = rand(1000, 100000)
  let rewardExp = rand(500, 10000)

  user.health -= damage
  user.lasthunt = now

  // KALAH / MATI
  if (user.health <= 0) {
    let msg = `*@${m.sender.split('@')[0]}* tewas dibunuh *${monster.name}*`

    if (user.level > 0) {
      user.level -= 1
      msg += `\n-1 Level`
    }
    if (user.sword >= 5) {
      user.sword -= 5
      msg += `\n-5 Sword`
    }

    user.health = 100
    return conn.reply(m.chat, msg, m, { mentions: [m.sender] })
  }

  // MENANG
  user.money += rewardMoney
  user.exp += rewardExp
  user.tiketcoin += 1

  let result = `
Berhasil membunuh *${monster.name}*
*@${m.sender.split('@')[0]}*

🎁 Hadiah:
• Money: ${rewardMoney.toLocaleString()}
• Exp: ${rewardExp.toLocaleString()}
• Tiketcoin: +1

❤️ Health:
-${damage} → Sisa ${user.health}
`.trim()

  conn.reply(m.chat, result, m, { mentions: [m.sender] })
}

handler.help = ['hunter']
handler.tags = ['rpg']
handler.command = /^hunter$/i
handler.limit = true
handler.group = true

export default handler

/* ================= UTIL ================= */

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function clockString(ms) {
  let h = Math.floor(ms / 3600000)
  let m = Math.floor(ms / 60000) % 60
  let s = Math.floor(ms / 1000) % 60
  return [h, m, s].map(v => v.toString().padStart(2, '0')).join(':')
}