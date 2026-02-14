import axios from 'axios'

class GSMArenaSearch {
  constructor() {
    this.baseURL = 'https://m.gsmarena.com'
    this.searchEndpoint = '/search-json.php3'
  }

  async search(query) {
    try {
      const res = await axios.get(
        `${this.baseURL}${this.searchEndpoint}`,
        {
          params: { sSearch: query },
          headers: {
            'user-agent':
              'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36',
            accept: 'application/json, text/plain, */*',
            referer: this.baseURL
          },
          timeout: 10000
        }
      )

      if (!res.data) return []
      if (res.data.error) return []

      return Array.isArray(res.data) ? res.data : []
    } catch (e) {
      console.log('GSM SEARCH ERROR:', e.message)
      return []
    }
  }

  async getSpecs(url) {
    try {
      const res = await axios.get(url, {
        headers: {
          'user-agent':
            'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36'
        },
        timeout: 10000
      })

      return res.data
    } catch (e) {
      console.log('GSM SPEC ERROR:', e.message)
      return null
    }
  }
}

const gsm = new GSMArenaSearch()

let handler = async (m, { conn, text }) => {
  conn.gsm = conn.gsm || {}

  // ===== MODE PILIHAN =====
  if (m.quoted && conn.gsm[m.chat]) {
    const choice = parseInt(m.text)

    if (isNaN(choice))
      return m.reply('Masukkan nomor yang valid')

    const session = conn.gsm[m.chat]
    const item = session.results[choice - 1]

    if (!item)
      return m.reply('Nomor tidak ada di daftar')

    const html = await gsm.getSpecs(item.url)
    if (!html)
      return m.reply('❌ Gagal mengambil spesifikasi')

    const spec = parseSpecs(html)

    await conn.sendMessage(
      m.chat,
      {
        image: { url: item.img },
        caption: `📱 *${item.name}*\n\n${spec}`
      },
      { quoted: m }
    )

    delete conn.gsm[m.chat]
    return
  }

  // ===== MODE SEARCH =====
  if (!text)
    return m.reply('Contoh: .gsm iphone 16')

  const results = await gsm.search(text)

  if (!results.length)
    return m.reply('❌ HP tidak ditemukan')

  const sliced = results.slice(0, 5)

  let caption = `🔎 *Hasil GSM Arena*\n\n`

  sliced.forEach((v, i) => {
    caption += `${i + 1}. ${v.name}\n`
  })

  caption += `\nBalas dengan nomor (1–5)`

  const sent = await conn.sendMessage(
    m.chat,
    { text: caption },
    { quoted: m }
  )

  conn.gsm[m.chat] = {
    results: sliced.map(v => ({
      name: v.name,
      url: `${gsm.baseURL}/${v.url}`,
      img: v.img
    })),
    msg: sent
  }
}

handler.help = ['gsm']
handler.tags = ['internet']
handler.command = /^gsm$/i

handler.desc = [
  'Mencari spesifikasi HP dari GSM Arena',
  'Menampilkan 5 hasil teratas',
  'Reply nomor untuk melihat detail spek'
]

export default handler

// ===== PARSER SPEC =====
function parseSpecs(html) {
  const clean = txt =>
    txt.replace(/<[^>]+>/g, '').trim()

  const get = (label) => {
    const regex = new RegExp(`<th[^>]*?>${label}</th>(.*?)</tr>`, 'is')
    const match = html.match(regex)
    if (!match) return '-'

    const td = match[1].match(/<td[^>]*?>(.*?)</is)
    return td ? clean(td[1]) : '-'
  }

  return `
📅 Rilis: ${get('Announced')}
⚖️ Berat: ${get('Weight')}
📏 Dimensi: ${get('Dimensions')}

🖥️ Layar: ${get('Type')}
📐 Size: ${get('Size')}
🔍 Resolusi: ${get('Resolution')}

⚙️ Chipset: ${get('Chipset')}
🧠 CPU: ${get('CPU')}
🎮 GPU: ${get('GPU')}

💾 RAM: ${get('Internal')}
📷 Kamera: ${get('Single')}
🔋 Baterai: ${get('Battery')}
`.trim()
}