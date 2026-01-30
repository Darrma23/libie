let handler = async (m, { text, conn }) => {
  let user = global.rpg.data.user[m.sender]

  user.afk = 1
  user.afkReason = text || 'AFK'
  user.afkTime = Date.now()

  m.reply(
    `${await conn.getName(m.sender)} sekarang AFK${text ? ': ' + text : ''}`
  )
}

handler.command = /^afk$/i
export default handler