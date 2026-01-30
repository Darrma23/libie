const PRICE = {
  hiu:      { buy: 1500, sell: 400 },
  ikan:     { buy: 500,  sell: 50 },
  dory:     { buy: 800,  sell: 200 },
  orca:     { buy: 1500, sell: 400 },
  paus:     { buy: 2000, sell: 900 },
  cumi:     { buy: 1400, sell: 300 },
  gurita:   { buy: 1600, sell: 500 },
  buntal:   { buy: 700,  sell: 100 },
  udang:    { buy: 500,  sell: 50 },
  lumba:    { buy: 1500, sell: 400 },
  lobster:  { buy: 800,  sell: 200 },
  kepiting: { buy: 700,  sell: 150 }
}

let handler = async (m, { conn, args, usedPrefix }) => {
  let user = global.rpg.data.user[m.sender]

  let action = (args[0] || '').toLowerCase() // buy | sell
  let item = (args[1] || '').toLowerCase()
  let count = Math.max(1, parseInt(args[2]) || 1)

  const menu = `
${usedPrefix}shopfish <buy|sell> <item> <jumlah>

Contoh:
${usedPrefix}shopfish buy hiu 1

*Fishing | Harga Beli*
${Object.entries(PRICE).map(([k,v]) => `${capitalize(k)}: ${v.buy}`).join('\n')}

*Fishing | Harga Jual*
${Object.entries(PRICE).map(([k,v]) => `${capitalize(k)}: ${v.sell}`).join('\n')}
`.trim()

  if (!['buy', 'sell'].includes(action)) return conn.reply(m.chat, menu, m)
  if (!PRICE[item]) return conn.reply(m.chat, menu, m)

  let harga = PRICE[item][action]
  let total = harga * count

  // ===== BUY =====
  if (action === 'buy') {
    if (user.money < total)
      return m.reply(`Money kamu tidak cukup.\nButuh ${total} money`)

    user.money -= total
    user[item] += count

    return m.reply(`Berhasil membeli ${count} ${capitalize(item)}\nHarga: ${total} money`)
  }

  // ===== SELL =====
  if (action === 'sell') {
    if (user[item] < count)
      return m.reply(`${capitalize(item)} kamu tidak cukup`)

    user[item] -= count
    user.money += total

    return m.reply(`Berhasil menjual ${count} ${capitalize(item)}\nDapat: ${total} money`)
  }
}

handler.help = ['shopfish']
handler.tags = ['rpg']
handler.command = /^(shopfish)$/i
handler.limit = true
handler.group = true

export default handler

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1)
}