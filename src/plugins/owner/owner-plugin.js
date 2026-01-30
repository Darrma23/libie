import fs from 'fs'
import path from 'path'

const PLUGIN_DIR = path.resolve('./src/plugins')

function scanPlugins(dir, base = dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(d => {
    const full = path.join(dir, d.name)
    if (d.isDirectory()) return scanPlugins(full, base)
    if (!/\.(js|ts)$/.test(d.name)) return []
    return path.relative(base, full).replace(/\\/g, '/')
  })
}

let handler = async (m, { text, conn }) => {
  const plugins = scanPlugins(PLUGIN_DIR)

  if (!text) {
    const list = plugins.map((v, i) => `${i + 1}. ${v}`).join('\n')

    return m.reply(
`_*Gunakan format: .plugin [opsi] [nomor atau path/file]*_

*Opsi:*
  \`+\` : Tambah / simpan plugin
  \`-\` : Hapus plugin
  \`?\` : Ambil kode plugin

*Contoh:*
> .plugin - 2 (menghapus plugin nomor 2)
> .plugin + owner/test.js (sambil membalas kode)

*– Daftar Plugin Tersedia:*
${plugins.map((v, i) => `  \`\`\`${i + 1}.\`\`\` \`\`\`${v}\`\`\``).join('\n')}
`
)
  }

  const [op, arg] = text.split(/\s+/)
  if (!op || !arg) return m.reply('Argumen kurang')

  const file = /^\d+$/.test(arg)
    ? plugins[Number(arg) - 1]
    : arg

  if (!file) return m.reply('Plugin tidak ditemukan')

  const target = path.join(PLUGIN_DIR, file)

  /* ===== LIHAT KODE + COPY BUTTON ===== */
  if (op === '?') {
    if (!fs.existsSync(target))
      return m.reply('Plugin tidak ada')

    const code = fs.readFileSync(target, 'utf8')
    const sliced = code.slice(0, 4000)

    await conn.client(m.chat, {
      text:
`📄 Plugin: ${file}`,
      title: 'Plugin Source',
      footer: 'Klik untuk copy kode',
      interactiveButtons: [
        {
          name: 'cta_copy',
          buttonParamsJson: JSON.stringify({
            display_text: 'Copy kode plugin',
            copy_code: code
          })
        }
      ],
      hasMediaAttachment: false
    })

    return
  }

  return m.reply('Opsi tidak dikenal')
}

handler.help = ['plugin']
handler.tags = ['owner']
handler.owner = true
handler.command = /^plugin$/i

export default handler