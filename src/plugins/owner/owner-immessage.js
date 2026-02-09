import { getDevice, isJidGroup } from 'baileys'

const resolveKey = (m) => {
  return (
    m?.key ||
    m?.vM?.key ||
    m?.quoted?.key ||
    m?.quoted?.vM?.key ||
    null
  )
}

let handler = async (m, { conn }) => {
  const msg = m.quoted || m

  const key = resolveKey(msg)
  if (!key) return m.reply('Tidak bisa membaca message key')

  const sender = msg.sender || msg.participant
   const pushName =
  (sender && await conn.getName(sender)) ||
  msg.pushName ||
  m.pushName ||
  '-'
  const remoteJid = key.remoteJid || m.chat

  const isGroup = isJidGroup(remoteJid)
  let isAdmin = 'tidak'

  if (isGroup) {
    try {
      const metadata = await conn.groupMetadata(remoteJid)
      const participant = metadata.participants.find(p => p.id === sender)
      if (participant?.admin) isAdmin = 'ya'
    } catch {
      // ga usah return, biarin lanjut
    }
  }

  const device = getDevice(key.id)
  const msgType = msg.mtype || msg.type || 'unknown'

  const print =
`👤 *account*
\`\`\`
name : ${pushName}
from : ${device}
lid  : ${sender}
jid  : ${remoteJid}
admin: ${isAdmin}
\`\`\`

✉️ *message*
\`\`\`
id
${key.id}

type
${msgType}
\`\`\`
`

  return conn.sendMessage(m.chat, { text: print }, { quoted: m })
}

handler.help = ['im']
handler.tags = ['owner']
handler.command = /^im$/i
handler.desc = ['Inspect pesan: lihat info sender, device, admin, dan message id']

export default handler