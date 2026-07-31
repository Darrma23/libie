import axios from "axios"

// Store sessions for conversation history
const sessions = {}

// Function to call the Libie API
async function libieChat(message, sessionId = null) {
  if (!message) throw new Error("Message is required.")

  // If we have a session, we need to handle conversation history
  let history = []
  if (sessionId && sessions[sessionId]) {
    history = sessions[sessionId].history || []
  }

  // Call the API
  const response = await axios.get('https://libieapiofficial.dpdns.org/api/ai/chat', {
    params: {
      text: message
    }
  })

  // Check if response is valid
  if (!response.data || !response.data.status) {
    throw new Error("API response error")
  }

  const result = response.data.data
  const reply = result.reply || "Maaf, saya tidak bisa menjawab saat ini."

  // Store history for session
  if (sessionId) {
    if (!sessions[sessionId]) {
      sessions[sessionId] = { history: [] }
    }
    sessions[sessionId].history.push(
      { role: "user", content: message },
      { role: "assistant", content: reply }
    )
    if (sessions[sessionId].history.length > 20) {
      sessions[sessionId].history = sessions[sessionId].history.slice(-20)
    }
  }

  return {
    text: reply,
    mode: result.mode || "text",
    source: result.source || "ai4chat"
  }
}

let handler = async (m, { conn, text, usedPrefix }) => {
  if (!text) {
    return conn.sendMessage(m.chat, {
      text: `📝 *Cara Penggunaan:*\n${usedPrefix}ai <pertanyaan>\n\nContoh:\n${usedPrefix}ai Halo, apa kabar?\n\n*Fitur:*\n• Ketik *reset* untuk menghapus sesi percakapan`
    })
  }

  // Reset session command
  if (text.toLowerCase() === "reset") {
    delete sessions[m.sender]
    return conn.sendMessage(m.chat, {
      text: "✅ *Sesi percakapan berhasil direset!*"
    })
  }

  try {
    // Show loading
    await conn.sendPresenceUpdate('composing', m.chat)

    // Get or create session
    const sessionId = m.sender

    // Call the API
    const result = await libieChat(text, sessionId)

    // Clean up the text - replace \n with actual newline
    let formattedReply = result.text
      .replace(/\\n/g, '\n')  // Replace literal \n with newline
      .replace(/\*\*(.+?)\*\*/g, '*$1*') // Bold formatting
    
    // Remove extra quotes if any
    formattedReply = formattedReply.replace(/^"|"$/g, '')
    
    // Build final message
    const finalMessage = `🤖 *Libie AI*\n\n${formattedReply}\n\n`
    
    // Send response
    await conn.sendMessage(m.chat, {
      text: finalMessage
    })

  } catch (err) {
    console.error("Libie AI Error:", err)
    await conn.sendMessage(m.chat, {
      text: `❌ *Error:* ${err.message || "Terjadi kesalahan, coba lagi nanti."}`
    })
  }
}

// Command configuration
handler.help = ['ai <pertanyaan>']
handler.tags = ['ai']
handler.command = /^(ai|libie|ask)$/i
handler.desc = [
  'Chat dengan AI Libie',
  'Support percakapan berkelanjutan',
  'Ketik .ai reset untuk hapus sesi'
]

export default handler