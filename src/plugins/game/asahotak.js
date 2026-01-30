const timeout = 180000
const poin = 500
const tiketcoin = 1
const URL = 'https://raw.githubusercontent.com/BochilTeam/database/master/games/asahotak.json'

let cache = null
async function getSoal() {
    if (!cache) {
        cache = await (await fetch(URL)).json()
    }
    return cache[Math.floor(Math.random() * cache.length)]
}

let handler = async (m, { conn, usedPrefix }) => {
    conn.asahotak ??= {}
    const id = m.chat

    if (conn.asahotak[id]) {
        return conn.reply(
            m.chat,
            'Masih ada soal belum terjawab di chat ini',
            conn.asahotak[id].msg
        )
    }

    const json = await getSoal()

    let caption = `
${json.soal}

Timeout *${(timeout / 1000).toFixed(2)} detik*
Ketik ${usedPrefix}ao untuk bantuan
Bonus: ${poin} XP
Tiketcoin: ${tiketcoin} TiketCoin
`.trim()

    const msg = await conn.reply(m.chat, caption, m)

    const timer = setTimeout(() => {
        if (!conn.asahotak[id]) return
        conn.reply(
            m.chat,
            `Waktu habis!\nJawabannya adalah *${json.jawaban}*`,
            msg
        )
        delete conn.asahotak[id]
    }, timeout)

    conn.asahotak[id] = {
        msg,
        soal: json,
        point: poin,
        tiket: tiketcoin,
        timer
    }
}

handler.help = ['asahotak']
handler.tags = ['game']
handler.command = /^asahotak$/i
handler.group = true
handler.limit = true

export default handler