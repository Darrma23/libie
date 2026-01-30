let handler = async (m, { conn, args, usedPrefix }) => {
    let user = global.rpg.data.user[m.sender]
    if (user.health >= 200) return  m.reply(`Your ❤️ Health is full!`.trim()) // conn.sendButton(m.chat, 'Your ❤️ Health is full!', set.author, 'https://telegra.ph/file/32f0ab58040511e2a3432.jpg', [['Heal Again?', '.heal']], m, { asLocation: true })
    // m.reply(`Your ❤️health is full!`.trim())
    const heal = 50 
    let count = Math.max(1, Math.min(Number.MAX_SAFE_INTEGER, (isNumber(args[0]) && parseInt(args[0]) || Math.round((200 - user.health) / heal)))) * 1
    if (user.potion < count) return m.reply(`
Your 🧃Potion is not enough, you only have *${user.potion}* 🧃Potion
type *${usedPrefix}shop buy potion ${count - user.potion}* to buy 🧃Potion
`.trim())
    user.potion -= count * 1
    user.health += heal * count
    // conn.sendButton(m.chat, `Successfully replenished health as much *${count}* 🧃 Potion(s)`.trim(), set.author, 'https://telegra.ph/file/0b5d33fe3bc405eeb57a3.jpg', [['Heal Again?', '.heal']], m, { asLocation: true })
    m.reply(`Successfully replenished health as much *${count}* 🧃 Potion(s)`.trim())
}

handler.help = ['heal']
handler.tags = ['rpg']
handler.command = /^(heal)$/i
handler.limit = true
handler.group = true

export default handler 

function isNumber(number) {
    if (!number) return number
    number = parseInt(number)
    return typeof number == 'number' && !isNaN(number)
}