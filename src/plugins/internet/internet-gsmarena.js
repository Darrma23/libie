// src/plugins/gsm.js
import axios from 'axios'

let handler = async (m, { conn, text }) => {
  conn.gsm = conn.gsm || {}

  if (m.quoted && conn.gsm[m.chat]) {
    const choice = parseInt(m.text)
    if (isNaN(choice)) return m.reply('Masukkan nomor yang valid')

    const session = conn.gsm[m.chat]
    const item = session.results[choice - 1]
    if (!item) return m.reply('Nomor tidak ada di daftar')

    try {
      await global.loading(m, conn)
      
      const data = await getSpecs(item.url)
      if (!data) return m.reply('❌ Gagal mengambil spesifikasi')

      await conn.sendMessage(
        m.chat,
        {
          image: { url: data.img },
          caption: `📱 *${data.name}*\n\n${data.html}`
        },
        { quoted: m }
      )

      delete conn.gsm[m.chat]
    } catch (e) {
      m.reply(`Error: ${e.message}`)
    } finally {
      await global.loading(m, conn, true)
    }
    return
  }

  if (!text) return m.reply('Contoh: .gsm iphone 15')

  try {
    await global.loading(m, conn)

    const results = await searchGSM(text)
    if (!results.length) return m.reply('❌ HP tidak ditemukan')

    const sliced = results.slice(0, 5)

    let caption = `🔎 *Hasil GSM Arena*\n\n`
    sliced.forEach((v, i) => {
      caption += `${i + 1}. ${v.name}\n`
    })
    caption += `\nBalas dengan nomor (1–5)`

    let sent = await conn.sendMessage(
      m.chat,
      { text: caption },
      { quoted: m }
    )

    conn.gsm[m.chat] = {
      results: sliced,
      msg: sent
    }

  } catch (e) {
    console.error('❌ GSM Error:', e.message)
    m.reply(`Error: ${e.message}`)
  } finally {
    await global.loading(m, conn, true)
  }
}

handler.help = ['gsm']
handler.tags = ['internet']
handler.command = /^gsm$/i
export default handler

async function searchGSM(query) {
  try {
    const url = `https://api.gsmarena.com/v2/search?q=${encodeURIComponent(query)}`
    
    const res = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json'
      },
      timeout: 10000
    })

    if (!res.data?.data?.items) return []
    
    return res.data.data.items.map(item => ({
      name: item.name || 'Unknown',
      url: item.slug || item.detail || '',
      img: item.image || ''
    }))

  } catch (e) {
    console.log('Search error:', e.message)
    return []
  }
}

async function getSpecs(slug) {
  try {
    const url = `https://api.gsmarena.com/v2/phones/${slug}`
    
    const res = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json'
      },
      timeout: 15000
    })

    if (!res.data?.data) return null

    const phone = res.data.data
    let spec = ''

    if (phone.specifications) {
      for (const [category, specs] of Object.entries(phone.specifications)) {
        spec += `\n*${category}*\n`
        if (Array.isArray(specs)) {
          specs.forEach(s => {
            spec += `▸ ${s.name}: ${s.value}\n`
          })
        }
      }
    }

    return {
      html: spec.trim() || '📋 Spesifikasi tidak tersedia',
      name: phone.name || 'Unknown',
      img: phone.image || ''
    }

  } catch (e) {
    console.log('Spec error:', e.message)
    return null
  }
}