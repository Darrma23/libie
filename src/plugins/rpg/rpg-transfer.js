let handler = async (m, { conn, args, usedPrefix, isOwner }) => {
  if (args.length < 3) {
    return conn.reply(
      m.chat,
      `Gunakan format:\n${usedPrefix}transfer <type> <jumlah> <@tag>\n\nContoh:\n${usedPrefix}transfer money 100 @user`,
      m
    )
  }

  const type = (args[0] || '').toLowerCase()
  const count = Math.max(parseInt(args[1]), 1)

  if (!m.mentionedJid || !m.mentionedJid[0]) {
    return m.reply('Tag salah satu user.')
  }

  const who = m.mentionedJid[0]
  const users = global.rpg.data.user

  const sender = users[m.sender]
  const target = users[who]

  if (!sender || !target) {
    return m.reply('User tidak ditemukan di database.')
  }

  // init aman
  sender.money ??= 0
  sender.exp ??= 0
  sender.user_limit ??= 0

  target.money ??= 0
  target.exp ??= 0
  target.user_limit ??= 0

  switch (type) {
    case 'money': {
      if (!isOwner && sender.money < count) {
        return m.reply(`Money kamu tidak cukup.\nPunya: ${sender.money}`)
      }

      if (!isOwner) sender.money -= count
      target.money += count

      return m.reply(`✅ Berhasil transfer *${count} Money*`)
    }

    case 'exp': {
      if (!isOwner && sender.exp < count) {
        return m.reply(`Exp kamu tidak cukup.\nPunya: ${sender.exp}`)
      }

      if (!isOwner) sender.exp -= count
      target.exp += count

      return m.reply(`✅ Berhasil transfer *${count} Exp*`)
    }

    case 'limit': {
      if (!isOwner && sender.user_limit < count) {
        return m.reply(`Limit kamu tidak cukup.\nPunya: ${sender.user_limit}`)
      }

      if (!isOwner) sender.user_limit -= count
      target.user_limit += count

      return m.reply(`✅ Berhasil transfer *${count} Limit*`)
    }

    default:
      return m.reply(
        `Type tidak valid.\n\nGunakan:\n• money\n• exp\n• limit`
      )
  }
}

handler.help = ['transfer']
handler.tags = ['rpg']
handler.command = /^(transfer)$/i
handler.group = true
handler.limit = true

export default handler