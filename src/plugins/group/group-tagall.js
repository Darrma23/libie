let handler = async (m, { text, participants, conn }) => {

  const q = m.quoted || m
  const txt = text || q.text || 'halo'

  const jids = participants.map(p => p.id)
  const tagText = jids.map(jid => `@${jid.split('@')[0]}`).join(' ')

  await conn.sendMessage(m.chat, {
    text: `@all ${txt}`,
    contextInfo: {
            nonJidMentions: true
        }
  })
}

handler.command = ['tagall']
handler.tags = ['group']
handler.group = true

export default handler