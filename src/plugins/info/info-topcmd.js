/**
 * @file Top Command Statistics
 * @module plugins/info/info-topcmd
 */

const formatWIB = (ms) => {
  if (!ms) return 'belum pernah'
  return new Date(ms).toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

let handler = async (m, { args }) => {
  const stats = global.db?.data?.stats || {}

  if (!Object.keys(stats).length) {
    return m.reply('Belum ada data command yang tercatat')
  }

  const sorted = Object.entries(stats)
    .map(([name, v]) => ({
      name,
      total: v.total || 0,
      success: v.success || 0,
      last: v.last || 0
    }))
    .sort((a, b) => b.total - a.total)

  const limit = args[0]
    ? Math.min(50, Math.max(parseInt(args[0]), 1))
    : 10

  let totalHit = 0
  let totalSuccess = 0

  for (const v of sorted) {
    totalHit += v.total
    totalSuccess += v.success
  }

  let text = `📊 *TOP COMMAND*\n`
  text += `🧩 Total plugin aktif: ${Object.keys(global.plugins).length}\n`
  text += `⚡ Total hit: ${totalHit}\n`
  text += `✅ Total sukses: ${totalSuccess}\n`

  text += sorted.slice(0, limit).map((v, i) => {
    return `${i + 1}. *${v.name.replace(/\.js$/, '')}*
• Digunakan: ${v.total}x
• Sukses: ${v.success}x
• Terakhir: ${formatWIB(v.last)}`
  }).join('\n\n')

  m.reply(text)
}

handler.help = ['topcmd [jumlah]']
handler.tags = ['info']
handler.command = /^(topcmd|dashboard|dash)$/i
handler.desc = [
  'Menampilkan command yang paling sering digunakan',
  'Data berdasarkan statistik internal bot',
  'Waktu ditampilkan dalam WIB'
]

export default handler