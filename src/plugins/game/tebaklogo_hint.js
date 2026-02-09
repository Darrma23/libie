let handler = async (m, { conn }) => {
  conn.tebaklogo = conn.tebaklogo || {}
  const id = m.chat

  if (!conn.tebaklogo[id]) throw false

  const game = conn.tebaklogo[id]
  const ans = game.soal.jawaban
  const clue = ans.replace(/[aiueo]/gi, '_')

  await conn.reply(
    m.chat,
    '```' + clue + '```\n\nBalas *pesan soal*, bukan pesan ini.',
    game.msg
  )
}

handler.command = /^tego$/i
handler.limit = true
handler.desc = ['Memberikan clue Tebak Logo']

export default handler