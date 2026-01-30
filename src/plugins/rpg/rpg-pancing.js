const COOLDOWN = 28800000 // 8 jam

let handler = async (m, { conn, usedPrefix, command, args }) => {
  let u = global.rpg.data.user[m.sender]
  if (!u) return m.reply('Data kamu belum terdaftar')

  let type = (args[0] || '').toLowerCase()
  if (!['easy', 'normal', 'hard', 'extreme'].includes(type)) {
    return m.reply(
      `${usedPrefix + command} [easy | normal | hard | extreme]\n` +
      `Contoh: ${usedPrefix + command} easy`
    )
  }

  // ===== INIT FIELD =====
  let fishList = [
    'paus','kepiting','gurita','cumi','buntal',
    'dory','lumba','lobster','hiu','udang','ikan','orca'
  ]

  for (let k of fishList) if (typeof u[k] !== 'number') u[k] = 0
  if (typeof u.tiketcoin !== 'number') u.tiketcoin = 0
  if (typeof u.umpan !== 'number') u.umpan = 0
  if (typeof u.pancingan !== 'number') u.pancingan = 0
  if (typeof u.lastmancing !== 'number') u.lastmancing = 0

  // ===== CONFIG =====
  const config = {
    easy:    { rod: 2, bait: 100, fishMax: 10, baitCost: 50 },
    normal:  { rod: 3, bait: 150, fishMax: 50, baitCost: 100 },
    hard:    { rod: 4, bait: 200, fishMax: 100, baitCost: 150 },
    extreme: { rod: 5, bait: 250, fishMax: 500, baitCost: 200 }
  }

  let cfg = config[type]

  // ===== CEK SYARAT =====
  if (u.pancingan < cfg.rod)
    return m.reply(`Minimal pancingan *Level ${cfg.rod}*`)
  if (u.umpan < cfg.bait)
    return m.reply(`Minimal umpan *${cfg.bait}*`)
  if (Date.now() - u.lastmancing < COOLDOWN)
    return m.reply(
      `Kamu capek.\nTunggu ${clockString(u.lastmancing + COOLDOWN - Date.now())}`
    )

  // ===== PROSES MEMANCING =====
  let hasil = {}
  for (let ikan of fishList) {
    hasil[ikan] = Math.floor(Math.random() * cfg.fishMax)
    u[ikan] += hasil[ikan]
  }

  let baitUsed = Math.floor(Math.random() * cfg.baitCost) + 1
  if (baitUsed > u.umpan) baitUsed = u.umpan

  u.umpan -= baitUsed
  u.tiketcoin += 1
  u.lastmancing = Date.now()

  // ===== OUTPUT =====
  let text = `
🎣 *HASIL MEMANCING (${type.toUpperCase()})*

🦀 Kepiting : ${hasil.kepiting}
🦞 Lobster : ${hasil.lobster}
🦐 Udang   : ${hasil.udang}
🐟 Ikan    : ${hasil.ikan}
🐠 Dory    : ${hasil.dory}
🐬 Lumba   : ${hasil.lumba}
🦈 Hiu     : ${hasil.hiu}
🐳 Orca    : ${hasil.orca}
🐋 Paus    : ${hasil.paus}

🎫 +1 Tiketcoin
🪱 Umpan -${baitUsed}
`.trim()

  m.reply('_Sedang memancing..._')
  setTimeout(() => m.reply('Menunggu...'), 5000)
  setTimeout(() => m.reply(text), 10000)
}

handler.help = ['pancing']
handler.tags = ['rpg']
handler.command = /^(pancing)$/i
handler.group = true
handler.limit = true

export default handler

function clockString(ms) {
  let h = Math.floor(ms / 3600000)
  let m = Math.floor(ms / 60000) % 60
  let s = Math.floor(ms / 1000) % 60
  return `${h} jam ${m} menit ${s} detik`
}