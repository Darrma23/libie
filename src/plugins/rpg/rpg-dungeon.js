async function handler(m, { conn, usedPrefix, command, text }) {
  const users = global.rpg.data.user
  const user = users[m.sender]
  if (!user) return m.reply('User tidak ditemukan.')

  // ===== CEK SYARAT =====
  const needSword = user.sword < 1
  const needArmor = user.armor < 1
  const needHealth = user.health < 90

  if (needSword || needArmor || needHealth) {
    return m.reply(item(user.sword, user.armor, user.health, usedPrefix))
  }

  // ===== COOLDOWN =====
  const cooldown = Date.now() - (user.lastdungeon || 0)
  if (cooldown < 7200000)
    return m.reply(`Tunggu ${clockString(7200000 - cooldown)} lagi untuk dungeon`)

  conn.dungeon = conn.dungeon || {}

  // ===== MASIH DI DUNGEON =====
  if (Object.values(conn.dungeon).some(r => r.players.includes(m.sender)))
    return m.reply('Kamu masih di dalam dungeon.')

  // ===== CARI ROOM =====
  let room = Object.values(conn.dungeon).find(r =>
    r.state === 'WAITING' && (text ? r.name === text : true)
  )

  // ===== JOIN ROOM =====
  if (room) {
    if (room.players.length >= 4)
      return m.reply('Dungeon sudah penuh.')

    room.players.push(m.sender)
    room.chats.push(m.chat)

    if (room.players.length === 4) room.state = 'READY'

    return conn.reply(
      m.chat,
      room.players.length < 4
        ? `Menunggu ${4 - room.players.length} player lagi...\nHost ketik *gass*`
        : `Party lengkap!\nHost ketik *gass*`,
      m
    )
  }

  // ===== BUAT ROOM BARU =====
  room = {
    id: 'dungeon-' + Date.now(),
    name: text || '',
    host: m.sender,
    state: 'WAITING',
    players: [m.sender],
    chats: [m.chat],
    less: {
      health: rand(20, 40),
      sword: rand(5, 15)
    },
    reward: {
      money: rand(2000, 6000),
      exp: rand(1000, 3000),
      diamond: pickRandom([0, 0, 0, 1]),
      iron: rand(0, 2),
      wood: rand(0, 2),
      rock: rand(0, 2)
    }
  }

  conn.dungeon[room.id] = room

  m.reply(
    `🏰 *Dungeon dibuat*\n\n` +
    `Host: @${m.sender.split('@')[0]}\n` +
    `Menunggu partner...\n\n` +
    `Host ketik *gass* untuk mulai\n` +
    `Host ketik *mundur* untuk batal`,
    { mentions: [m.sender] }
  )
}

// ===== BEFORE (GASS & MUNDUR) =====
handler.before = async function (m, { conn }) {
  conn.dungeon = conn.dungeon || {}
  let room = Object.values(conn.dungeon).find(r =>
    r.players.includes(m.sender) && r.state !== 'PLAYING'
  )
  if (!room) return

  if (!/^(gass|mundur)$/i.test(m.text)) return

  // ===== HANYA HOST =====
  if (m.sender !== room.host)
    return m.reply('Lu bukan host.')

  // ===== BATAL =====
  if (/^mundur$/i.test(m.text)) {
    delete conn.dungeon[room.id]
    return m.reply('Dungeon dibatalkan.')
  }

  // ===== MULAI =====
  if (room.players.length < 2)
    return m.reply('Minimal 2 player buat mulai.')

  room.state = 'PLAYING'

  broadcast(conn, room,
    `⚔️ *Dungeon dimulai!*\n\n` +
    room.players.map(M).join(', ')
  )

  // ===== SIMULASI PERANG =====
  setTimeout(() => resolveDungeon(conn, room), rand(3000, 8000))
}

// ===== RESOLVE DUNGEON =====
function resolveDungeon(conn, room) {
  const users = global.rpg.data.user
  const { health, sword } = room.less
  const r = room.reward

  let text = `🏆 *Dungeon selesai!*\n\nDamage:\n❤️ -${health}\n⚔️ -${sword}\n\nReward:\n`

  for (let jid of room.players) {
    let u = users[jid]
    if (!u) continue

    if (typeof u.sworddurability !== 'number')
      u.sworddurability = u.sword * 50

    u.health = Math.max(0, u.health - health)
    u.sworddurability -= sword

    if (u.sworddurability <= 0) {
      u.sword--
      u.sworddurability = Math.max(0, u.sword * 50)
    }

    u.money += r.money
    u.exp += r.exp
    u.diamond += r.diamond
    u.iron += r.iron
    u.wood += r.wood
    u.rock += r.rock
    u.lastdungeon = Date.now()
  }

  text +=
    `💰 Money +${r.money}\n` +
    `✉️ Exp +${r.exp}\n` +
    `${r.diamond ? '💎 Diamond +' + r.diamond + '\n' : ''}`

  broadcast(conn, room, text)
  delete conn.dungeon[room.id]
}

// ===== UTIL =====
function broadcast(conn, room, text) {
  for (let chat of room.chats) {
    conn.reply(chat, text, null, { mentions: room.players })
  }
}

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function M(jid) {
  return '@' + jid.split('@')[0]
}

function clockString(ms) {
  let h = Math.floor(ms / 3600000)
  let m = Math.floor(ms / 60000) % 60
  let s = Math.floor(ms / 1000) % 60
  return [h, m, s].map(v => v.toString().padStart(2, 0)).join(':')
}

function item(sword, armor, health, usedPrefix) {
  let msg = []
  if (sword < 1) msg.push(`⚔️ Sword belum ada → *${usedPrefix}meracik sword*`)
  if (armor < 1) msg.push(`🥼 Armor belum ada → *${usedPrefix}shop buy armor*`)
  if (health < 90) msg.push(`❤️ Health kurang → *${usedPrefix}heal*`)
  return msg.join('\n')
}

handler.help = ['dungeon [nama]']
handler.tags = ['rpg']
handler.command = /^(dungeon)$/i
handler.group = true
handler.limit = true

export default handler