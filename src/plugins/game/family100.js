const winScore = 1000

let handler = async (m, { conn }) => {
  conn.game = conn.game || {}

  const id = 'family100_' + m.chat
  if (conn.game[id]) {
    await conn.reply(
      m.chat,
      'Masih ada kuis *Family 100* yang belum selesai.',
      conn.game[id].msg
    )
    return
  }

  const res = await fetch(
    'https://raw.githubusercontent.com/BochilTeam/database/master/games/family100.json'
  )
  if (!res.ok) throw 'Gagal ambil soal.'

  const data = await res.json()
  const json = data[Math.floor(Math.random() * data.length)]

  const caption = `
*🎮 FAMILY 100*

*Soal:*
${json.soal}

Terdapat *${json.jawaban.length}* jawaban
${json.jawaban.some(v => v.includes(' ')) ? '(beberapa jawaban mengandung spasi)' : ''}

+${winScore} Money tiap jawaban benar
`.trim()

  const msg = await m.reply(caption)

  conn.game[id] = {
    id,
    msg,
    soal: json.soal,
    jawaban: json.jawaban,
    terjawab: Array(json.jawaban.length).fill(false),
    winScore,
  }
}

handler.help = ['family100']
handler.tags = ['game']
handler.command = /^family100$/i
handler.group = true
handler.limit = true

export default handler