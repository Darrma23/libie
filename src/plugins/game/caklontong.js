import fetch from 'node-fetch'

let timeout = 180000
let poin = 500
let tiketcoin = 1

let handler = async (m, { conn, usedPrefix }) => {
  conn.caklontong = conn.caklontong || {}
  let id = m.chat

  if (id in conn.caklontong) {
    return conn.reply(
      m.chat,
      'Masih ada soal belum terjawab di chat ini',
      conn.caklontong[id][0]
    )
  }

  let src = await (await fetch(
    'https://raw.githubusercontent.com/BochilTeam/database/master/games/caklontong.json'
  )).json()

  let json = src[Math.floor(Math.random() * src.length)]

  let caption = `
${json.soal}

⏱️ Timeout *${(timeout / 1000).toFixed(0)} detik*
💡 Ketik *${usedPrefix}calo* untuk bantuan
🎁 Bonus: ${poin} XP
🎟️ Tiketcoin: ${tiketcoin}
`.trim()

  conn.caklontong[id] = [
    await conn.reply(m.chat, caption, m),
    json,
    setTimeout(() => {
      if (conn.caklontong[id]) {
        conn.reply(
          m.chat,
          `⏰ *Waktu habis!*\nJawabannya adalah *${json.jawaban}*\n${json.deskripsi}`,
          conn.caklontong[id][0]
        )
        delete conn.caklontong[id]
      }
    }, timeout)
  ]
}

handler.before = async function (m, { conn }) {
  conn.caklontong = conn.caklontong || {}
  let id = m.chat
  if (!(id in conn.caklontong)) return
  if (!m.text) return
  if (m.key.fromMe) return

  let [msg, json] = conn.caklontong[id]
  let jawaban = json.jawaban.toLowerCase().trim()

  if (m.text.toLowerCase().trim() !== jawaban) return

  let user = global.rpg.data.user[m.sender]
  if (!user) return

  user.exp += poin
  user.tiketcoin += tiketcoin

  conn.reply(
    m.chat,
    `✅ *Jawaban benar!*\n\n+${poin} XP\n+${tiketcoin} Tiketcoin`,
    msg
  )

  clearTimeout(conn.caklontong[id][2])
  delete conn.caklontong[id]
}

handler.help = ['caklontong']
handler.tags = ['game']
handler.command = /^caklontong$/i
handler.limit = true
handler.group = true

export default handler