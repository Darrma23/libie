let handler = async (m, { conn, args, usedPrefix, command }) => {

  const harga = {
    // KEBUTUHAN
    limit:        { buy: 25000,  sell: 20000 },
    tiketmonster: { buy: 20000 },
    tiketcoin:    { buy: 500 },
    koinexpg:     { buy: 500000 },

    // BARANG
    potion:    { buy: 20000,  sell: 100 },
    diamond:   { buy: 100000, sell: 1000 },
    common:    { buy: 100000, sell: 1000 },
    uncommon:  { buy: 100000, sell: 100 },
    mythic:    { buy: 100000, sell: 1000 },
    legendary: { buy: 200000, sell: 5000 },

    // RESOURCE
    sampah: { buy: 120, sell: 5 },
    wood:   { buy: 1000, sell: 400 },
    botol:  { buy: 300,  sell: 50 },
    kaleng: { buy: 400,  sell: 100 },
    kardus: { buy: 400,  sell: 50 },
    batu:   { buy: 500,  sell: 100 },
    string: { buy: 50000, sell: 5000 },
    iron:   { buy: 20000, sell: 5000 },
    sword:  { buy: 150000, sell: 15000 },
    emas:   { buy: 150000, sell: 15000 },

    // MAKANAN
    pisang: { buy: 5500, sell: 100 },
    mangga: { buy: 4600, sell: 150 },
    jeruk:  { buy: 6000, sell: 300 },
    anggur: { buy: 5500, sell: 150 },
    apel:   { buy: 5500, sell: 400 },

    // BIBIT
    bibitpisang: { buy: 550, sell: 50 },
    bibitmangga: { buy: 550, sell: 50 },
    bibitjeruk:  { buy: 550, sell: 50 },
    bibitanggur: { buy: 550, sell: 50 },
    bibitapel:   { buy: 550, sell: 50 },

    // PET FOOD
    makananpet:      { buy: 50000, sell: 500 },
    makananphonix:  { buy: 80000, sell: 5000 },
    makanangriffin: { buy: 80000, sell: 5000 },
    makanannaga:    { buy: 150000, sell: 10000 },
    makanankyubi:   { buy: 150000, sell: 10000 },
    makanancentaur: { buy: 150000, sell: 10000 },

    // MINUMAN
    aqua: { buy: 5000, sell: 1000 },

    // FISHING
    umpan:      { buy: 1500, sell: 100 },
    pancingan: { buy: 5000000, sell: 500000 },

    // EQUIPMENT
    armor: { buy: [20000, 50000, 100000, 200000] }
  }

  const rupiah = n => n?.toLocaleString('id-ID') ?? '-'

  const action = (args[0] || '').toLowerCase()
  const item   = (args[1] || '').toLowerCase()
  const count  = Math.max(parseInt(args[2]) || 1, 1)

  const user = global.rpg.data.user[m.sender]
  if (!user || !user.registered)
    return global.dfail('register', m, conn)

  // ================= SHOP LIST =================
  if (!action) {
    const sections = {
      'KEBUTUHAN': ['limit', 'tiketmonster', 'tiketcoin', 'koinexpg'],
      'EQUIPMENT': ['armor', 'sword'],
      'BARANG': ['potion', 'diamond', 'common', 'uncommon', 'mythic', 'legendary'],
      'RESOURCE': ['wood', 'batu', 'iron', 'string', 'emas'],
      'SAMPAH': ['sampah', 'botol', 'kaleng', 'kardus'],
      'MAKANAN': ['pisang', 'mangga', 'jeruk', 'anggur', 'apel'],
      'BIBIT': ['bibitpisang', 'bibitmangga', 'bibitjeruk', 'bibitanggur', 'bibitapel'],
      'PET FOOD': [
        'makananpet',
        'makananphonix',
        'makanangriffin',
        'makanannaga',
        'makanankyubi',
        'makanancentaur'
      ],
      'MINUMAN': ['aqua'],
      'FISHING': ['umpan', 'pancingan']
    }

    let text = `🛒 *SHOP RPG*\n`
    text += `Penggunaan:\n${usedPrefix}${command} <buy|sell> <item> <jumlah>\n`
    text += `Contoh: ${usedPrefix}${command} buy potion 1\n\n`

    for (const [title, items] of Object.entries(sections)) {
      text += `*${title}*\n`
      for (const i of items) {
        const d = harga[i]
        if (!d) continue

        text += `• ${i}\n`
        if (Array.isArray(d.buy)) {
          d.buy.forEach((p, idx) => {
            text += `  beli lvl ${idx + 1}: ${rupiah(p)}\n`
          })
        } else {
          text += `  beli : ${rupiah(d.buy)}\n`
        }
        if (d.sell) text += `  jual : ${rupiah(d.sell)}\n`
      }
      text += '\n'
    }

    return m.reply(text.trim())
  }

  // ================= VALIDASI =================
  if (!['buy', 'sell'].includes(action))
    return m.reply(`Gunakan ${usedPrefix}${command} buy|sell <item> <jumlah>`)

  if (!harga[item])
    return m.reply('❌ Item tidak tersedia.')

  // ================= LIMIT =================
  if (item === 'limit') {
    if (!harga.limit[action]) return m.reply('❌ Aksi tidak valid')

    const total = harga.limit[action] * count
    if (action === 'buy') {
      if (user.money < total) return m.reply(`❌ Uang kurang (${rupiah(total)})`)
      user.money -= total
      user.user_limit += count
      return m.reply(`✅ Beli ${count} limit\n💰 -${rupiah(total)}`)
    }

    if (action === 'sell') {
      if (user.user_limit < count) return m.reply('❌ Limit kurang')
      user.user_limit -= count
      user.money += total
      return m.reply(`✅ Jual ${count} limit\n💰 +${rupiah(total)}`)
    }
  }

  // ================= ARMOR =================
  if (item === 'armor') {
    if (action !== 'buy')
      return m.reply('❌ Armor tidak bisa dijual')

    let tier = user.armor || 0
    if (tier >= harga.armor.buy.length)
      return m.reply('❌ Armor sudah MAX')

    let price = harga.armor.buy[tier]
    if (user.money < price)
      return m.reply(`❌ Uang kurang (${rupiah(price)})`)

    user.money -= price
    user.armor = tier + 1
    return m.reply(`🛡️ Armor naik ke level ${user.armor}\n💰 -${rupiah(price)}`)
  }

  // ================= ITEM NORMAL =================
  if (!harga[item][action])
    return m.reply(`❌ Item ini tidak bisa di-${action}`)

  const total = harga[item][action] * count

  if (action === 'buy') {
    if (user.money < total)
      return m.reply(`❌ Uang kurang (${rupiah(total)})`)
    user.money -= total
    user[item] = (user[item] || 0) + count
    return m.reply(`✅ Beli ${count} ${item}\n💰 -${rupiah(total)}`)
  }

  if (action === 'sell') {
    if ((user[item] || 0) < count)
      return m.reply('❌ Item kurang')
    user[item] -= count
    user.money += total
    return m.reply(`✅ Jual ${count} ${item}\n💰 +${rupiah(total)}`)
  }
}

handler.help = ['shop']
handler.tags = ['rpg']
handler.command = /^shop$/i
handler.register = true
handler.limit = true
handler.exp = 5
handler.group = true

export default handler