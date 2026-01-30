let handler = async (m) => {
    let who
    if (m.isGroup) who = m.mentionedJid[0] ? m.mentionedJid[0] : m.sender
    else who = m.sender
    if (typeof global.rpg.data.user[who] == 'undefined') throw 'Pengguna tidak ada didalam data base'
    m.reply(`${global.rpg.data.user[who].money} Your money`)
}
handler.help = ['dompet']
handler.tags = ['xp']
handler.command = /^(dompet)$/i

export default handler