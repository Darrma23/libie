const timeout = 180000
const poin = 500
const tiketcoin = 1
const URL = 'https://raw.githubusercontent.com/BochilTeam/database/master/games/siapakahaku.json'

let cache = null
async function getSoal() {
    if (!cache) {
        cache = await (await fetch(URL)).json()
    }
    return cache[Math.floor(Math.random() * cache.length)]
}

let handler = async (m, { conn, usedPrefix }) => {
    conn.siapakahaku ??= {}
    const id = m.chat

    if (conn.siapakahaku[id]) {
        return conn.reply(
            m.chat,
            'Masih ada soal belum terjawab di chat ini',
            conn.siapakahaku[id].msg
        )
    }

    const json = await getSoal()

    const caption = `
Siapakah aku?
${json.soal}

Timeout *${(timeout / 1000).toFixed(2)} detik*
Ketik ${usedPrefix}who untuk bantuan
Bonus: ${poin} XP
TiketCoin: ${tiketcoin} TiketCoin
`.trim()

    const msg = await conn.reply(m.chat, caption, m)

    const timer = setTimeout(() => {
        if (!conn.siapakahaku[id]) return
        conn.reply(
            m.chat,
            `Waktu habis!\nJawabannya adalah *${json.jawaban}*`,
            msg
        )
        delete conn.siapakahaku[id]
    }, timeout)

    conn.siapakahaku[id] = {
        msg,
        soal: json,
        point: poin,
        tiket: tiketcoin,
        timer
    }
}

handler.help = ['siapakahaku']
handler.tags = ['game']
handler.command = /^siapa(kah)?aku$/i
handler.limit = true
handler.group = true

export default handler