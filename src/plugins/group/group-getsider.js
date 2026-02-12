const DAY = 24 * 60 * 60 * 1000 // 24 jam

let handler = async (m, { groupMetadata, conn, command }) => {
  if (!groupMetadata)
    return m.reply('Metadata grup belum siap')

  const users = global.rpg.data.user
  const now = Date.now()

  const members = groupMetadata.participants
    .filter(p => !p.admin)
    .map(p => p.id)

  let sider = []
  let report = []

  for (const jid of members) {
    const user = users[jid]

    // belum pernah chat
    if (!user || !user.lastgc) {
      report.push({
        jid,
        lastgc: 0,
        status: 'tidak pernah chat'
      })
      continue
    }

    const diff = now - user.lastgc
    const time = formatDuration(diff)

    if (diff >= DAY) {
      sider.push(jid)
      report.push({
        jid,
        lastgc: user.lastgc,
        status: `${time} lalu (SIDER)`
      })
    } else {
      report.push({
        jid,
        lastgc: user.lastgc,
        status: `${time} lalu`
      })
    }
  }

  if (!report.length)
    return m.reply('Tidak ada data aktivitas member.')

  // 🔥 SORTING: TERBARU → TERLAMA
  report.sort((a, b) => {
    if (a.lastgc === 0) return 1
    if (b.lastgc === 0) return -1
    return b.lastgc - a.lastgc
  })

  let text = `📊 *Aktivitas Member Grup*\n`
  text += `⏱️ Batas sider: *24 jam*\n\n`

  report.forEach((v, i) => {
    text += `${i + 1}. @${v.jid.split('@')[0]}\n`
    text += `   ▸ ${v.status}\n\n`
  })

  await conn.reply(m.chat, text.trim(), m, {
    mentions: report.map(v => v.jid)
  })

  // MODE KICK
  if (/out/.test(command)) {
    for (const jid of sider) {
      await conn.delay(3000)
      await conn.groupParticipantsUpdate(m.chat, [jid], 'remove')
    }
  }
}

handler.help = ['sider', 'outsider']
handler.tags = ['group']
handler.command = /^(sider|outsider)$/i

handler.group = true
handler.admin = true
handler.botAdmin = true

handler.desc = [
  'Menampilkan waktu terakhir chat seluruh member grup.',
  'Diurutkan dari yang paling baru chat sampai yang paling lama.',
  'Member yang tidak aktif lebih dari 24 jam dianggap SIDER.',
  'Gunakan `outsider` untuk langsung mengeluarkan sider.'
]

export default handler

// ===== helper =====
function formatDuration(ms) {
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  const h = Math.floor(m / 60)
  const d = Math.floor(h / 24)

  if (d > 0) return `${d} hari ${h % 24} jam`
  if (h > 0) return `${h} jam ${m % 60} menit`
  if (m > 0) return `${m} menit`
  return `${s} detik`
}