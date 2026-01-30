let handler = async (m, { conn }) => {
  conn.caklontong = conn.caklontong || {}
  let id = m.chat

  // ga ada soal aktif
  if (!(id in conn.caklontong)) {
    return m.reply('Tidak ada soal caklontong yang aktif.')
  }

  // cegah bot ngerespon diri sendiri
  if (m.key?.fromMe) return

  let json = conn.caklontong[id][1]
  let ans = json.jawaban

  // samarkan huruf (konsonan), biarin vokal
  let clue = ans
    .toLowerCase()
    .replace(/[bcdfghjklmnpqrstvwxyz]/gi, '_')

  m.reply(
    `💡 *Clue Jawaban:*\n` +
    '```' + clue + '```'
  )
}

handler.command = /^calo$/i
handler.limit = true
handler.group = true

export default handler