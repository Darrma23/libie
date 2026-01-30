import similarity from 'similarity'

const THRESHOLD_BENAR = 0.9
const THRESHOLD_HAMPIR = 0.72

const normalize = s =>
  s.toLowerCase().replace(/[^\w\s\-]+/g, '').trim()

let handler = async () => {}

handler.before = async function (m, { conn }) {
  // ================= FILTER PALING AWAL =================
  if (m.fromMe) return true
  if (!m.text) return true

  // ================= DETEKSI NYERAH =================
  const isSurrender = /^((me)?nyerah|surr?ender)$/i.test(m.text)

  // command lain skip, TAPI nyerah harus tembus
  if (m.isCommand && !isSurrender) return true

  // ================= CEK GAME =================
  conn.game = conn.game || {}
  const id = 'family100_' + m.chat
  const room = conn.game[id]
  if (!room) return true

  const text = normalize(m.text)
  if (!text) return true

  // ================= PROSES JAWABAN =================
  if (!isSurrender) {
    const answers = room.jawaban.map(normalize)

    const index = answers.findIndex((ans, i) => {
      if (room.terjawab[i]) return false
      return similarity(ans, text) >= THRESHOLD_BENAR
    })

    // SALAH / HAMPIR
    if (index === -1) {
      const hampir = answers.some(
        (ans, i) =>
          !room.terjawab[i] &&
          similarity(ans, text) >= THRESHOLD_HAMPIR
      )
      if (hampir) await m.reply('Dikit lagi!')
      return true
    }

    // SUDAH TERJAWAB
    if (room.terjawab[index]) return true

    // === BENAR ===
    room.terjawab[index] = m.sender

    const user = global.rpg?.data?.user?.[m.sender]
    if (user) user.money += room.winScore
  }

  // ================= CEK SELESAI =================
  const isWin = room.terjawab.every(v => v)
  const selesai = isWin || isSurrender

  // ================= RENDER PAPAN =================
  let mentions = []

  const caption = `
*Soal:*
${room.soal}

${isWin ? '*SEMUA JAWABAN TERJAWAB!*' : isSurrender ? '*MENYERAH!*' : '*JAWABAN TERBUKA:*'}

${room.jawaban
  .map((jawaban, i) => {
    if (!selesai && !room.terjawab[i]) return null

    let siapa = ''
    if (room.terjawab[i]) {
      const jid = room.terjawab[i]
      siapa = ' @' + jid.split('@')[0]
      mentions.push(jid) // ✅ JID ASLI, BUKAN LID
    }

    return `(${i + 1}) ${jawaban}${siapa}`
  })
  .filter(Boolean)
  .join('\n')}

${selesai ? '' : `+${room.winScore} Money tiap jawaban benar`}
`.trim()

  await conn.reply(m.chat, caption, m, { mentions })

  // ================= TUTUP SESSION =================
  if (selesai) {
    delete conn.game[id]
  }

  return false
}

handler.exp = 0
export default handler