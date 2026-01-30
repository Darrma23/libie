const moneymins = 1
let handler = async (m, { conn, command, args }) => {
  let count = command.replace(/^pull/i, '')
  count = count ? /all/i.test(count) ? Math.floor(global.rpg.data.user[m.sender].bank / moneymins) : parseInt(count) : args[0] ? parseInt(args[0]) : 1
  count = Math.max(1, count)
  if (global.rpg.data.user[m.sender].bank >= moneymins * count) {
    global.rpg.data.user[m.sender].bank -= moneymins * count
    global.rpg.data.user[m.sender].money += count
    conn.reply(m.chat, `-${moneymins * count} ATM\n+ ${count} Money`, m)
  } else conn.reply(m.chat, `ATM kamu tersisah ${count} !!`, m)
}
handler.help = ['pull', 'pullall']
handler.tags = ['rpg']
handler.command = /^pull([0-9]+)|pull|pullall$/i
handler.limit = true
handler.group = true

export default handler