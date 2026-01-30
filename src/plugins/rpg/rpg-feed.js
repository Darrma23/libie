let handler = async (m, { conn, args, usedPrefix, command }) => {
  let type = (args[0] || '').toLowerCase()
  let user = global.rpg.data.user[m.sender]
  const COOLDOWN = 600000

  const pets = {
    kucing:   { lvl: 'kucing',   max: 5,  food: 'makananpet',  exp: 'anakkucing',   expAdd: 20, need: 1000 },
    rubah:    { lvl: 'rubah',    max: 5,  food: 'makananpet',  exp: 'anakrubah',    expAdd: 20, need: 1000 },
    kuda:     { lvl: 'kuda',     max: 5,  food: 'makananpet',  exp: 'anakkuda',     expAdd: 20, need: 1000 },
    serigala: { lvl: 'serigala', max: 15, food: 'makananpet',  exp: 'anakserigala', expAdd: 20, need: 10000 },
    naga:     { lvl: 'naga',     max: 20, food: 'makanannaga', exp: 'anaknaga',     expAdd: 20, need: 10000 },
    kyubi:    { lvl: 'kyubi',    max: 20, food: 'makanankyubi',exp: 'anakkyubi',    expAdd: 20, need: 10000 },
    centaur:  { lvl: 'centaur',  max: 20, food: 'makanancentaur', exp: 'anakcentaur', expAdd: 20, need: 10000 },
    phonix:   { lvl: 'phonix',   max: 15, food: 'makananphonix', exp: 'anakphonix',  expAdd: 20, need: 10000 },
    griffin:  { lvl: 'griffin',  max: 15, food: 'makanangriffin', exp: 'anakgriffin',expAdd: 20, need: 10000 },
    hero:     { lvl: 'hero',     max: 100,food: 'pillhero',   exp: 'exphero',       expAdd: 10, need: 500 }
  }

  let pet = pets[type]
  if (!pet) {
    return m.reply(
      `${usedPrefix + command} ${Object.keys(pets).join(' | ')}`
    )
  }

  let level = user[pet.lvl]
  if (level <= 0) return m.reply(`*Kamu belum memiliki ${type}*`)
  if (level >= pet.max) return m.reply(`*${type} kamu sudah level maksimal*`)

  let lastKey = `${type}lastclaim`
  let last = user[lastKey] || 0
  let now = Date.now()

  if (now - last < COOLDOWN) {
    return m.reply(`Pet kamu sudah kenyang, coba lagi *${clockString(COOLDOWN - (now - last))}*`)
  }

  if ((user[pet.food] || 0) <= 0) {
    return m.reply(`Makanan ${type} kamu tidak cukup`)
  }

  // makan
  user[pet.food] -= 1
  user[pet.exp] += pet.expAdd
  user[lastKey] = now

  conn.reply(m.chat, `Berhasil memberi makan ${type}`, m)

  setTimeout(() => {
    conn.reply(m.chat, `Waktunya memberi makan pet *${type}*\nSaya lapar tuan..`, m)
  }, COOLDOWN)

  // cek level up
  let needExp = (level * pet.need) - 1
  if (user[pet.exp] > needExp) {
    user[pet.lvl] += 1
    user[pet.exp] -= level * pet.need
    conn.reply(m.chat, `*Selamat ${type} kamu naik level*`, m)
  }
}

handler.help = ['feed']
handler.tags = ['rpg']
handler.command = /^(feed(ing)?)$/i
handler.limit = true
handler.group = true

export default handler

function clockString(ms) {
  let h = Math.floor(ms / 3600000)
  let m = Math.floor(ms / 60000) % 60
  let s = Math.floor(ms / 1000) % 60
  return [h, m, s].map(v => v.toString().padStart(2, 0)).join(':')
}