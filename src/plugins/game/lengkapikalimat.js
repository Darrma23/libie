
const timeout = 180000
const poin = 500
const tiketcoin = 1
const URL = 'https://raw.githubusercontent.com/Aiinne/scrape/main/lengkapikalimat.json'

let cache = null
async function getSoal() {
    if (!cache) {
        cache = await (await fetch(URL)).json()
    }
    return cache[Math.floor(Math.random() * cache.length)]
}

let handler = async (m, { conn, usedPrefix }) => {
    conn.lengkapikalimat ??= {}
    const id = m.chat

    if (conn.lengkapikalimat[id]) {
        return conn.reply(
            m.chat,
            'Masih ada soal belum terjawab di chat ini',
            conn.lengkapikalimat[id].msg
        )
    }

    const json = await getSoal()

    let caption = `
${json.pertanyaan}

Timeout *${(timeout / 1000).toFixed(2)} detik*
Ketik ${usedPrefix}leka untuk bantuan
Bonus:
${poin} XP
${tiketcoin} TiketCoin
`.trim()

    const msg = await conn.reply(m.chat, caption, m)

    const timer = setTimeout(() => {
        if (!conn.lengkapikalimat[id]) return
        conn.reply(
            m.chat,
            `Waktu habis!\nJawabannya adalah *${json.jawaban}*`,
            msg
        )
        delete conn.lengkapikalimat[id]
    }, timeout)

    conn.lengkapikalimat[id] = {
        msg,
        soal: json,
        point: poin,
        tiket: tiketcoin,
        timer
    }
}

handler.help = ['lengkapikalimat']
handler.tags = ['game']
handler.command = /^lengkapikalimat$/i
handler.group = true
handler.limit = true

export default handler