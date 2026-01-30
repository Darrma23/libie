let handler = async (m, { conn, args, usedPrefix, command }) => {
  let user = global.rpg.data.user[m.sender]
  let type = (args[0] || '').toLowerCase()

  const COOLDOWN = 600000

  const recipes = {
    ramuan: {
      need: { apel: 500, mangga: 500, jeruk: 500, pisang: 500, anggur: 500 },
      result: { ramuan: () => pickRandom([1,2,3,4,5]) },
      last: 'lastramuanclaim',
      text: 'ramuan'
    },
    potion: {
      need: { apel: 500, mangga: 500, jeruk: 500, pisang: 500, anggur: 500 },
      result: { potion: () => pickRandom([1,2,3,4,5,6,7,8,9,10]) },
      last: 'lastpotionclaim',
      text: 'potion'
    },
    string: {
      need: { apel: 500, mangga: 500, jeruk: 500, pisang: 500, anggur: 500 },
      result: { string: () => pickRandom([1,2,3,4]) },
      last: 'laststringclaim',
      text: 'string'
    },
    sword: {
      need: { iron: 5, wood: 500, string: 10 },
      result: { sword: () => pickRandom([1,2]) },
      last: 'lastswordclaim',
      text: 'sword'
    },
    iron: {
      need: { emas: 5, string: 5 },
      result: { iron: () => pickRandom([1,2]) },
      last: 'lastsironclaim',
      text: 'iron'
    }
  }

  let r = recipes[type]
  if (!r) {
    return m.reply(
      `Contoh:\n${usedPrefix + command} ramuan\n\n` +
      `List:\n${Object.keys(recipes).join(', ')}`
    )
  }

  // cooldown
  let last = user[r.last] || 0
  let now = Date.now()
  if (now - last < COOLDOWN) {
    return m.reply(`Tunggu ${clockString(COOLDOWN - (now - last))}`)
  }

  // cek bahan
  for (let item in r.need) {
    if ((user[item] || 0) < r.need[item]) {
      return m.reply(`Pastikan ${item} kamu *${r.need[item]}*`)
    }
  }

  // kurangi bahan
  let usedText = []
  for (let item in r.need) {
    user[item] -= r.need[item]
    usedText.push(`-${r.need[item]} ${item}`)
  }

  // hasil
  let gainText = []
  for (let item in r.result) {
    let qty = r.result[item]()
    user[item] += qty
    gainText.push(`+${qty} ${item}`)
  }

  user[r.last] = now

  let msg = `
Berhasil meracik ${r.text}:
${usedText.join('\n')}

Hasil:
${gainText.join('\n')}
`.trim()

  await conn.reply(m.chat, 'Sedang mengaduk...', m)
  setTimeout(() => conn.reply(m.chat, msg, m), 2000)
}

handler.help = ['meracik']
handler.tags = ['rpg']
handler.command = /^(meracik|racik)$/i
handler.limit = true
handler.group = true

export default handler

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function clockString(ms) {
  let h = Math.floor(ms / 3600000)
  let m = Math.floor(ms / 60000) % 60
  let s = Math.floor(ms / 1000) % 60
  return [h,m,s].map(v => v.toString().padStart(2,0)).join(':')
}