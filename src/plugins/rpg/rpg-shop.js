import { createPayment } from '../../lib/pakasir.js';
import { Database } from "bun:sqlite";
import { join } from "node:path";

const DB_PATH = join(process.cwd(), "src", "database", "database.db");
const db = new Database(DB_PATH);

let handler = async (m, { conn, args, usedPrefix, command }) => {

  const harga = {
    limit:        { buy: 25000,  sell: 20000, qris: true },
    tiketmonster: { buy: 20000 },
    tiketcoin:    { buy: 500 },
    exp:     { buy: 500000, qris: true },
    potion:    { buy: 20000,  sell: 100 },
    diamond:   { buy: 100000, sell: 1000 },
    common:    { buy: 100000, sell: 1000 },
    uncommon:  { buy: 100000, sell: 100 },
    mythic:    { buy: 100000, sell: 1000 },
    legendary: { buy: 200000, sell: 5000 },
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
    pisang: { buy: 5500, sell: 100 },
    mangga: { buy: 4600, sell: 150 },
    jeruk:  { buy: 6000, sell: 300 },
    anggur: { buy: 5500, sell: 150 },
    apel:   { buy: 5500, sell: 400 },
    bibitpisang: { buy: 550, sell: 50 },
    bibitmangga: { buy: 550, sell: 50 },
    bibitjeruk:  { buy: 550, sell: 50 },
    bibitanggur: { buy: 550, sell: 50 },
    bibitapel:   { buy: 550, sell: 50 },
    makananpet:      { buy: 50000, sell: 500 },
    makananphonix:  { buy: 80000, sell: 5000 },
    makanangriffin: { buy: 80000, sell: 5000 },
    makanannaga:    { buy: 150000, sell: 10000 },
    makanankyubi:   { buy: 150000, sell: 10000 },
    makanancentaur: { buy: 150000, sell: 10000 },
    aqua: { buy: 5000, sell: 1000 },
    umpan:      { buy: 1500, sell: 100 },
    pancingan: { buy: 5000000, sell: 500000 },
    armor: { buy: [20000, 50000, 100000, 200000] }
  }

  const rupiah = n => n?.toLocaleString('id-ID') ?? '-'

  const action = (args[0] || '').toLowerCase()
  const item   = (args[1] || '').toLowerCase()
  const count  = Math.max(parseInt(args[2]) || 1, 1)

  const user = global.rpg.data.user[m.sender]
  if (!user || !user.registered)
    return m.reply('❌ Kamu belum register. Ketik *.register* dulu.')

  // ================= SHOP LIST =================
  if (!action) {
    let text = `🛒 *SHOP RPG*\n`
    text += `Penggunaan:\n${usedPrefix}${command} <buy|sell> <item> <jumlah>\n`
    text += `Contoh: ${usedPrefix}${command} buy potion 1\n\n`

    for (const [itemKey, val] of Object.entries(harga)) {
      if (!val.buy && !val.sell) continue
      text += `• ${itemKey}${val.qris ? ' 💳QRIS' : ''}\n`
      if (Array.isArray(val.buy)) {
        val.buy.forEach((p, idx) => {
          text += `  beli lvl ${idx + 1}: ${rupiah(p)}\n`
        })
      } else if (val.buy) {
        text += `  beli : ${rupiah(val.buy)}\n`
      }
      if (val.sell) text += `  jual : ${rupiah(val.sell)}\n`
    }

    return m.reply(text.trim())
  }

  // ================= VALIDASI =================
  if (!['buy', 'sell'].includes(action))
    return m.reply(`Gunakan ${usedPrefix}${command} buy|sell <item> <jumlah>`)

  if (!harga[item])
    return m.reply('❌ Item tidak tersedia.')

<<<<<<< Updated upstream
=======
  // ================= QRIS ITEMS =================
   if (harga[item]?.qris && action === 'buy') {
     const total = harga[item].buy * count
     const orderId = `SHOP-${Date.now()}-${m.sender.slice(0, 6)}`
   
     db.run(`
       INSERT INTO orders (id, user_id, item, quantity, total_price, status)
       VALUES (?, ?, ?, ?, ?, 'pending')
     `, orderId, m.sender, item, count, total)
   
     try {
       const payment = await createPayment(orderId, total, user.name || 'Customer')
   
       // === BUAT QRIS JADI GAMBAR ===
       const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(payment.qr_string)}`
   
       // Kirim gambar QRIS
       await conn.sendMessage(m.chat, {
         image: { url: qrImageUrl },
         caption:
           `🛒 *Order ${item}*\n\n` +
           `📦 ${count} ${item}\n` +
           `💰 Total: ${rupiah(total)}\n` +
           `🆔 Order ID: *${orderId}*\n` +
           `⏰ Kadaluarsa: ${payment.expired_at ? new Date(payment.expired_at).toLocaleString() : '15 menit'}\n\n` +
           `_Scan QRIS di atas untuk membayar._\n` +
           `_Pembayaran otomatis terdeteksi._`
       }, { quoted: m })
   
       return
     } catch (err) {
       console.error('QRIS Error:', err)
       return m.reply(`❌ Gagal generate QRIS. Silakan transfer manual.\nTotal: ${rupiah(total)}`)
     }
   }

>>>>>>> Stashed changes
  // ================= JUAL LIMIT =================
  if (item === 'limit' && action === 'sell') {
    if (user.user_limit < count) return m.reply('❌ Limit kurang')
    const total = harga.limit.sell * count
    user.user_limit -= count
    user.money += total
    return m.reply(`✅ Jual ${count} limit\n💰 +${rupiah(total)}`)
  }

  // ================= ARMOR =================
  if (item === 'armor') {
    if (action !== 'buy') return m.reply('❌ Armor tidak bisa dijual')
    let tier = user.armor || 0
    if (tier >= harga.armor.buy.length) return m.reply('❌ Armor sudah MAX')
    let price = harga.armor.buy[tier]
    if (user.money < price) return m.reply(`❌ Uang kurang (${rupiah(price)})`)
    user.money -= price
    user.armor = tier + 1
    return m.reply(`🛡️ Armor naik ke level ${user.armor}\n💰 -${rupiah(price)}`)
  }

  // ================= ITEM NORMAL =================
  if (!harga[item][action]) return m.reply(`❌ Item ini tidak bisa di-${action}`)
  const total = harga[item][action] * count

  if (action === 'buy') {
<<<<<<< Updated upstream
    // ---- Bayar pakai saldo (money) dari DB dulu ----
    if (user.money >= total) {
      user.money -= total
      if (item === 'limit') user.user_limit = (user.user_limit || 0) + count
      else user[item] = (user[item] || 0) + count
      return m.reply(`✅ Beli ${count} ${item}\n💰 -${rupiah(total)}`)
    }

    // ---- Saldo kurang: fallback ke QRIS kalau item mendukung ----
    if (!harga[item].qris) return m.reply(`❌ Uang kurang (${rupiah(total)})`)

    const orderId = `SHOP-${Date.now()}-${m.sender.slice(0, 6)}`

    db.run(`
      INSERT INTO orders (id, user_id, item, quantity, total_price, status)
      VALUES (?, ?, ?, ?, ?, 'pending')
    `, orderId, m.sender, item, count, total)

    try {
      const payment = await createPayment(orderId, total, user.name || 'Customer')

      // === BUAT QRIS JADI GAMBAR ===
      const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(payment.qr_string)}`

      // Kirim gambar QRIS
      await conn.sendMessage(m.chat, {
        image: { url: qrImageUrl },
        caption:
          `🛒 *Order ${item}*\n\n` +
          `📦 ${count} ${item}\n` +
          `💰 Total: ${rupiah(total)}\n` +
          `💳 Saldo kurang ${rupiah(total - user.money)}\n` +
          `🆔 Order ID: *${orderId}*\n` +
          `⏰ Kadaluarsa: ${payment.expired_at ? new Date(payment.expired_at).toLocaleString() : '15 menit'}\n\n` +
          `_Scan QRIS di atas untuk membayar._\n` +
          `_Pembayaran otomatis terdeteksi._`
      }, { quoted: m })

      return
    } catch (err) {
      console.error('QRIS Error:', err)
      return m.reply(`❌ Uang kurang (${rupiah(total)}) & gagal generate QRIS. Silakan coba lagi.`)
    }
=======
    if (user.money < total) return m.reply(`❌ Uang kurang (${rupiah(total)})`)
    user.money -= total
    user[item] = (user[item] || 0) + count
    return m.reply(`✅ Beli ${count} ${item}\n💰 -${rupiah(total)}`)
>>>>>>> Stashed changes
  }

  if (action === 'sell') {
    if ((user[item] || 0) < count) return m.reply('❌ Item kurang')
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