import fs from 'fs'
import path from 'path'

const PLUGIN_DIR = path.resolve('./src/plugins')

function scanPlugins(dir, base = dir) {
  if (!fs.existsSync(dir)) return []

  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(d => {
    const full = path.join(dir, d.name)

    // skip symlink biar gak bikin recursive hell
    if (d.isSymbolicLink?.()) return []

    if (d.isDirectory()) return scanPlugins(full, base)
    if (!/\.(js|ts)$/.test(d.name)) return []

    return path.relative(base, full).replace(/\\/g, '/')
  })
}

function resolvePlugin(file) {
  const target = path.resolve(PLUGIN_DIR, file)

  const relative = path.relative(PLUGIN_DIR, target)

  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    return null
  }

  return target
}

// inject sendRichResponse
async function ensureRich(conn) {
  if (conn.sendRichResponse) return

  const { randomUUID } = await import('crypto')

  conn.sendRichResponse = async (jid, data = {}, options = {}) => {
    const submessages = []

    if (data.text) {
      submessages.push({
        messageType: 2,
        messageText: data.text
      })
    }

    const sections = []

    // CTA copy code
    if (data.code) {
      sections.push({
        view_model: {
          primitive: {
            text: data.text || '',
            cta: {
              type: "COPY_TO_CLIPBOARD",
              label: "📋 Copy Code",
              payload: data.code.code || ''
            },
            __typename: "GenAIMarkdownTextUXPrimitive"
          },
          __typename: "GenAISingleLayoutViewModel"
        }
      })
    }

    const unifiedResponseData = {
      response_id: randomUUID(),
      sections
    }

    const content = {
      botForwardedMessage: {
        message: {
          richResponseMessage: {
            messageType: 1,
            submessages,
            unifiedResponse: {
              data: JSON.stringify(unifiedResponseData)
            }
          }
        }
      }
    }

    return await conn.relayMessage(jid, content, {
      ...options,
      messageId: randomUUID()
    })
  }
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

  if (!op || !arg) {
    return m.reply('Argumen kurang')
  }

  const file = /^\d+$/.test(arg)
    ? plugins[Number(arg) - 1]
    : arg

  if (!file) {
    return m.reply('Plugin tidak ditemukan')
  }

  const target = resolvePlugin(file)

  if (!target) {
    return m.reply('Path plugin tidak valid')
  }

  // ➕ tambah plugin
  if (op === '+') {
    const quotedText =
      m.quoted?.text ||
      m.quoted?.caption ||
      m.quoted?.body ||
      ''

    if (!quotedText) {
      return m.reply('Reply kode plugin yang mau disimpan')
    }

    const dir = path.dirname(target)

    fs.mkdirSync(dir, { recursive: true })

    fs.writeFileSync(target, quotedText)

    return m.reply(`✅ Plugin disimpan:\n${file}`)
  }

  // ➖ hapus plugin
  if (op === '-') {
    if (!fs.existsSync(target)) {
      return m.reply('Plugin tidak ada')
    }

    const stat = fs.lstatSync(target)

    if (!stat.isFile()) {
      return m.reply('Target bukan file')
    }

    if (stat.isSymbolicLink()) {
      return m.reply('Symlink tidak diizinkan')
    }

    fs.unlinkSync(target)

    return m.reply(`🗑 Plugin dihapus:\n${file}`)
  }

  // ❓ ambil plugin
  if (op === '?') {
    if (!fs.existsSync(target)) {
      return m.reply('Plugin tidak ada')
    }

    const stat = fs.lstatSync(target)

    if (!stat.isFile()) {
      return m.reply('Target bukan file')
    }

    if (stat.isSymbolicLink()) {
      return m.reply('Symlink tidak diizinkan')
    }

    const code = fs.readFileSync(target, "utf8")

   await conn.client(
       m.chat,
       {
           text: [
               "*─── [ PLUGIN ANALYSIS ] ───*",
               "",
               `📁 Name: ${path.basename(file)}`,
               `⚖️ Size: ${(stat.size / 1024).toFixed(2)} KB`,
               `🧩 Ext: ${path.extname(file)}`,
               `📍 Path: ${file}`,
               "",
               "Tekan tombol di bawah untuk menyalin source plugin."
           ].join("\n"),
           title: "Plugin",
           footer: "Libie",
           interactiveButtons: [
               {
                   name: "cta_copy",
                   buttonParamsJson: JSON.stringify({
                       display_text: "📋 Copy Plugin",
                       copy_code: code.slice(0, 8000),
                   }),
               },
           ],
           hasMediaAttachment: false,
       },
       { quoted: m }
   )
    return
  }

  return m.reply('Opsi tidak dikenal')
}

handler.help = ['plugin']
handler.tags = ['owner']
handler.owner = true
handler.command = /^plugin$/i

export default handler