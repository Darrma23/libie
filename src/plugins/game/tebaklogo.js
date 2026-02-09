const TIMEOUT = 180000
const POINT = 1000
const TIKET = 1

let handler = async (m, { conn, usedPrefix }) => {
  conn.tebaklogo = conn.tebaklogo || {}
  const id = m.chat

  if (conn.tebaklogo[id]) {
    return m.reply('Masih ada soal Tebak Logo yang belum terjawab di chat ini')
  }

  const data = await fetch(
    'https://raw.githubusercontent.com/Aiinne/scrape/main/tebaklogo.json'
  ).then(res => res.json())

  const soal = data[Math.floor(Math.random() * data.length)]

  const caption = `
🖼️ *Tebak Logo*

${soal.deskripsi}

Timeout *${TIMEOUT / 1000} detik*
Ketik ${usedPrefix}tego untuk clue

🎁 Bonus:
+${POINT} XP
+${TIKET} TiketCoin

*Balas pesan ini untuk menjawab*
`.trim()

  const msg = await conn.sendMessage(
    m.chat,
    {
      text: caption,
      contextInfo: {
        externalAdReply: {
          title: 'Tebak Logo 🖼️',
          body: 'Tantangan Logo',
          thumbnailUrl: soal.img,
          mediaUrl: soal.img,
          mediaType: 1,
          renderLargerThumbnail: true,
          showAdAttribution: false,
        },
      },
    },
    { quoted: m }
  )

  const timer = setTimeout(() => {
    if (!conn.tebaklogo[id]) return
    conn.reply(
      m.chat,
      `⏰ *Waktu habis!*\nJawabannya adalah *${soal.jawaban}*`,
      msg
    )
    delete conn.tebaklogo[id]
  }, TIMEOUT)

  conn.tebaklogo[id] = {
    msg,
    soal,
    point: POINT,
    tiket: TIKET,
    timer,
  }
}

handler.help = ['tebaklogo']
handler.tags = ['game']
handler.command = /^tebaklogo$/i
handler.group = true
handler.limit = true
handler.desc = [
  'Game tebak logo',
  'Jawaban harus membalas pesan soal',
  'Gunakan tego untuk melihat clue'
]

export default handler