import { xpRange } from '#lib/levelling.js'

let handler = async (m, { conn }) => {
  const user = global.rpg.data.user[m.sender]
  if (!user) return m.reply('❌ User tidak ditemukan.')

  let {
    health, armor, pet,
    kucing, anakkucing,
    rubah, anakrubah,
    serigala, anakserigala,
    naga, anaknaga,
    kuda, anakkuda,
    phonix, anakphonix,
    griffin, anakgriffin,
    kyubi, anakkyubi,
    centaur, anakcentaur,
    diamond, potion, ramuan,
    common, uncommon, mythic, legendary,
    makananpet, makanannaga, makananphonix,
    makanangriffin, makanankyubi, makanancentaur,
    level, money, exp,
    sampah, anggur, jeruk, apel, mangga, pisang,
    bibitanggur, bibitjeruk, bibitapel, bibitmangga, bibitpisang,
    gardenboxs, bank, user_limit,
    cupon, tiketcoin, healtmonster,
    aqua, wood, boxs, botol, kaleng, kardus,
    iron, sword, string,
    emas,
    hero, exphero
  } = user

  let { max } = xpRange(level, exp, global.multiplier || 1)
  let name = m.sender

  const readMore = String.fromCharCode(8206).repeat(4001)

  let str = `
Inventory *${await conn.getName(name)}*

Health: *${health}*
Armor: *${armor == 0 ? 'Tidak Punya' : '' || armor == 1 ? 'Leather Armor' : '' || armor == 2 ? 'Iron Armor' : '' || armor == 3 ? 'Gold Armor' : '' || armor == 4 ? 'Diamond Armor' : '' || armor == 5 ? 'Netherite Armor' : ''}*
Money: *${money}*
Limit: *${user_limit}*
Level: *${level}*
Exp: *${exp}*
Atm: *${bank}*
Cupon: *${cupon}*
Tiketm: *${healtmonster}*
Tiketcoin: *${tiketcoin}*
${readMore}
*Inventory*
Potion: *${potion}*
Ramuan: *${ramuan}*
Iron: *${iron}*
String: *${string}*
Sword: *${sword}*
Sampah: *${sampah}*
Aqua: *${aqua}*
Kayu: *${wood}*
Makanan Pet: *${makananpet}*
Makanan Phonix: *${makananphonix}*
Makanan Naga: *${makanannaga}*
Makanan Griffin: *${makanangriffin}*
Makanan Kyubi: *${makanankyubi}*
Makanan Centaur: *${makanancentaur}*

*Crate*
Boxs: *${boxs}*
Common: *${common}*
Uncommon: *${uncommon}*
Mythic: *${mythic}*
Legendary: *${legendary}*.
Pet: *${pet}*
Gardenboxs: *${gardenboxs}*

*Fruits*
Mangga: ${mangga}
Anggur: ${anggur}
Pisang: ${pisang}
Jeruk: ${jeruk}
Apel: ${apel}

*Seeds*
Bibit Mangga: ${bibitmangga}
Bibit Anggur: ${bibitanggur}
Bibit Pisang: ${bibitpisang}
Bibit Jeruk: ${bibitjeruk}
Bibit Apel: ${bibitapel}

*Trash Man*
Kardus: ${kardus}
Kaleng: ${kaleng}
Botol: ${botol}

*Mining*
Emas: ${emas}
Diamond: ${diamond}

*Hero*
My Hero: *${hero == 0 ? 'Tidak Punya' : '' || hero > 0 && hero < 40 ? `Level ${hero}` : '' || hero == 40 ? 'Level MAX' : ''}*

*Pet*
Kucing: *${kucing == 0 ? 'Tidak Punya' : '' || kucing < 5 ? `Level ${kucing}` : 'Level MAX'}*
Kuda: *${kuda == 0 ? 'Tidak Punya' : '' || kuda < 5 ? `Level ${kuda}` : 'Level MAX'}*
Rubah: *${rubah == 0 ? 'Tidak Punya' : '' || rubah < 5 ? `Level ${rubah}` : 'Level MAX'}*
Serigala: *${serigala == 0 ? 'Tidak Punya' : '' || serigala < 15 ? `Level ${serigala}` : 'Level MAX'}*
Naga: *${naga == 0 ? 'Tidak Punya' : '' || naga < 20 ? `Level ${naga}` : 'Level MAX'}*
Phonix: *${phonix == 0 ? 'Tidak Punya' : '' || phonix < 15 ? `Level ${phonix}` : 'Level MAX'}*
Kyubi: *${kyubi == 0 ? 'Tidak Punya' : '' || kyubi < 20 ? `Level ${kyubi}` : 'Level MAX'}*
Centaur: *${centaur == 0 ? 'Tidak Punya' : '' || centaur < 20 ? `Level ${centaur}` : 'Level MAX'}*
Griffin: *${griffin == 0 ? 'Tidak Punya' : '' || griffin < 15 ? `Level ${griffin}` : 'Level MAX'}*

*Progres*
╭────────────────
│Level *${level}* → *${level + 1}*
│Exp *${exp}* → *${max}*
╰────────────────
`.trim()

  await conn.reply(m.chat, str, m)
}

handler.help = ['inv', 'inventory']
handler.tags = ['rpg']
handler.command = /^(inv|inventory)$/i
handler.limit = true
handler.group = true
handler.register = true

export default handler