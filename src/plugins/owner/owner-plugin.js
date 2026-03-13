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

function resolvePlugin(file) {
  const target = path.resolve(PLUGIN_DIR, file)

  if (!target.startsWith(PLUGIN_DIR)) return null
  return target
}

let handler = async (m, { text, conn }) => {
  const plugins = scanPlugins(PLUGIN_DIR)

  if (!text) {
    return m.reply(
`_*Gunakan format: .plugin [opsi] [nomor atau path/file]*_

*Opsi:*
  \`+\` : Tambah / simpan plugin
  \`-\` : Hapus plugin
  \`?\` : Ambil kode plugin

*Contoh:*
> .plugin - 2
> .plugin + owner/test.js (sambil reply kode)

*– Daftar Plugin:*
${plugins.map((v, i) => `  \`\`\`${i + 1}.\`\`\` \`\`\`${v}\`\`\``).join('\n')}
`
)
  }

  const [op, arg] = text.trim().split(/\s+/)

  if (!op || !arg) return m.reply('Argumen kurang')

  const file = /^\d+$/.test(arg)
    ? plugins[Number(arg) - 1]
    : arg

  if (!file) return m.reply('Plugin tidak ditemukan')

  const target = resolvePlugin(file)
  if (!target) return m.reply('Path plugin tidak valid')

  if (op === '+') {
    if (!m.quoted?.text)
      return m.reply('Reply kode plugin yang mau disimpan')

    const dir = path.dirname(target)
    fs.mkdirSync(dir, { recursive: true })

    fs.writeFileSync(target, m.quoted.text)

    return m.reply(`✅ Plugin disimpan:\n${file}`)
  }

  if (op === '-') {
    if (!fs.existsSync(target))
      return m.reply('Plugin tidak ada')

    fs.unlinkSync(target)

    return m.reply(`🗑 Plugin dihapus:\n${file}`)
  }

  if (op === '?') {
    if (!fs.existsSync(target))
      return m.reply('Plugin tidak ada')

    const code = fs.readFileSync(target, 'utf8')
    const sliced = code.slice(0, 4000)

    await conn.client(m.chat, {
      text: `📄 Plugin: ${file}`,
      title: 'Plugin Source',
      footer: 'Klik untuk copy kode',
      interactiveButtons: [
        {
          name: 'cta_copy',
          buttonParamsJson: JSON.stringify({
            display_text: 'Copy kode plugin',
            copy_code: sliced
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