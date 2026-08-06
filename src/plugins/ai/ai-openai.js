import axios from "axios"
import crypto from "crypto"

const CONFIG = {
  URLS: {
    CHAT: "https://deepseekv2-qbvg2hl3qq-uc.a.run.app",
    KEY: "https://rotatingkey-qbvg2hl3qq-uc.a.run.app",
  },
  HEADERS: {
    "User-Agent": "okhttp/4.12.0",
    "Accept-Encoding": "gzip",
    "Content-Type": "application/json",
  },
  AES_INPUT_KEY: "NiIsImtpZCI6I56",
}

const MODELS = {
  "deepseek-chat": "deepseek-chat",
  "deepseek-reasoner": "deepseek-reasoner"
}

async function getSecretKey() {
  const res = await axios.get(CONFIG.URLS.KEY, {
    headers: { "User-Agent": "Android" },
    timeout: 10000
  })

  const key = res.data?.rotatingKey

  if (!key) {
    throw new Error("rotatingKey kosong")
  }

  return key
}

function generateSecurityHeaders(secretKey) {
  const iv = crypto.randomBytes(16)

  const keyBuffer = Buffer.from(
    secretKey.padEnd(16, "0").substring(0, 16),
    "utf8"
  )

  const cipher = crypto.createCipheriv(
    "aes-128-cbc",
    keyBuffer,
    iv
  )

  let encrypted = cipher.update(CONFIG.AES_INPUT_KEY, "utf8")
  encrypted = Buffer.concat([encrypted, cipher.final()])

  return {
    iv: iv.toString("base64"),
    authorization: "Bearer " + encrypted.toString("base64")
  }
}

async function deepseekChat(message) {
  if (!message) throw new Error("Message is required.")

  try {
    // Get secret key
    const secretKey = await getSecretKey()
    const security = generateSecurityHeaders(secretKey)

    // Get current time in WIB
    const now = new Date().toLocaleString("id-ID", {
      timeZone: "Asia/Jakarta"
    })

    const enhancedPrompt = `${message}\n\nWaktu saat ini: ${now}`

    const payload = {
      data: enhancedPrompt,
      iv: security.iv,
      messages: [{ role: "user", content: enhancedPrompt }],
      model: "deepseek-chat",
      secretKey
    }

    const response = await axios.post(
      CONFIG.URLS.CHAT,
      payload,
      {
        headers: {
          ...CONFIG.HEADERS,
          authorization: security.authorization
        },
        timeout: 30000
      }
    )

    const result = response.data?.data?.choices?.[0]?.message?.content

    if (!result) {
      throw new Error("Response AI kosong")
    }

    return {
      text: result,
      model: "deepseek-chat"
    }

  } catch (error) {
    if (error.code === 'ECONNABORTED') {
      throw new Error("⏰ Server tidak merespons, coba lagi nanti.")
    }
    if (error.response) {
      console.error('API Error:', error.response.data)
      throw new Error(`Server error: ${error.response.status}`)
    } else if (error.request) {
      throw new Error("📡 Tidak ada respons dari server, cek koneksi internet.")
    } else {
      throw new Error(error.message || "❌ Terjadi kesalahan")
    }
  }
}

let handler = async (m, { conn, text, usedPrefix }) => {
  if (!text) {
    return conn.sendMessage(m.chat, {
      text: `📝 *Cara Penggunaan:*\n${usedPrefix}ai <pertanyaan>\n\nContoh:\n${usedPrefix}ai Halo, apa kabar?`
    })
  }

  try {
    // Show loading
    await conn.sendPresenceUpdate('composing', m.chat)
    
    // Start loading
    if (global.loading) {
      await global.loading(m, conn)
    }

    // Call DeepSeek API langsung
    const result = await deepseekChat(text)

    // Clean up the text
    let formattedReply = result.text
      .replace(/\\n/g, '\n')
      .replace(/\*\*(.+?)\*\*/g, '*$1*')
      .replace(/^"|"$/g, '')
    
    // Send response
    await conn.sendMessage(m.chat, {
      text: `${formattedReply}`
    })

  } catch (err) {
    console.error("DeepSeek Error:", err)
    await conn.sendMessage(m.chat, {
      text: err.message || "❌ Terjadi kesalahan, coba lagi nanti."
    })
  } finally {
    // Stop loading
    if (global.loading) {
      await global.loading(m, conn, true)
    }
  }
}

// Command configuration
handler.help = ['ai']
handler.tags = ['ai']
handler.command = /^(ai|deepseek|ask)$/i
handler.desc = [
  'Chat dengan DeepSeek AI (Direct API)',
  'Menggunakan endpoint DeepSeek original',
  'Support image (coming soon)'
]

export default handler