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

// inject sendRichResponse (sekali aja, jangan spam define)
async function ensureRich(conn) {
  if (conn.sendRichResponse) return

  conn.sendRichResponse = async (jid, data = {}, options = {}) => {
    const { randomUUID } = await import('crypto')
    const submessages = []
    const sections = []

    if (data.text) {
      submessages.push({
        messageType: 2,
        messageText: data.text
      })
      sections.push({
        view_model: {
          primitive: {
            text: data.text,
            __typename: "GenAIMarkdownTextUXPrimitive"
          },
          __typename: "GenAISingleLayoutViewModel"
        }
      })
    }

    if (data.code) {
      submessages.push({
        messageType: 5,
        codeMetadata: {
          codeLanguage: data.code.language || "javascript",
          codeBlocks: [
            {
              codeContent: data.code.code,
              highlightType: 0
            }
          ]
        }
      })

      sections.push({
        view_model: {
          primitive: {
            language: data.code.language || "javascript",
            code_blocks: [
              { content: data.code.code, type: "DEFAULT" }
            ],
            __typename: "GenAICodeUXPrimitive"
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
      messageId: `RICH_${Date.now()}`
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

  if (!op || !arg) return m.reply('Argumen kurang')

  const file = /^\d+$/.test(arg)
    ? plugins[Number(arg) - 1]
    : arg

  if (!file) return m.reply('Plugin tidak ditemukan')

  const target = resolvePlugin(file)
  if (!target) return m.reply('Path plugin tidak valid')

  // ➕ tambah plugin
  if (op === '+') {
    if (!m.quoted?.text)
      return m.reply('Reply kode plugin yang mau disimpan')

    const dir = path.dirname(target)
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(target, m.quoted.text)

    return m.reply(`✅ Plugin disimpan:\n${file}`)
  }

  // ➖ hapus plugin
  if (op === '-') {
    if (!fs.existsSync(target))
      return m.reply('Plugin tidak ada')

    fs.unlinkSync(target)

    return m.reply(`🗑 Plugin dihapus:\n${file}`)
  }

  // ❓ ambil plugin (INI YANG DI-UPGRADE)
  if (op === '?') {
    if (!fs.existsSync(target))
      return m.reply('Plugin tidak ada')

    await ensureRich(conn)

    const stats = fs.statSync(target)
    const code = fs.readFileSync(target, 'utf8')

    const caption = `
*─── [ PLUGIN ANALYSIS ] ───*

📁 Name: ${path.basename(file)}
⚖️ Size: ${(stats.size / 1024).toFixed(2)} KB
🧩 Ext: ${path.extname(file)}
📍 Path: ${file}
`.trim()

    await conn.sendRichResponse(m.chat, {
      text: caption,
      code: {
        code: code.slice(0, 8000),
        language: "javascript"
      }
    }, { quoted: m })

    return
  }

  return m.reply('Opsi tidak dikenal')
}

handler.help = ['plugin']
handler.tags = ['owner']
handler.owner = true
handler.command = /^plugin$/i

export default handler