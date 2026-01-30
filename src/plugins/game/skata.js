import skata from '#lib/skata.js'

const GAME_INFO = `╔══「 *Kata Bersambung* 」
╟ Game Kata Bersambung adalah
║  permainan dimana setiap
║  pemain harus membuat kata
║  dari akhir kata sebelumnya.
╚═════`.trim()

const RULES = `╔══「 *PERATURAN* 」
╟ Jawaban adalah kata dasar
║  (tanpa spasi & imbuhan)
╟ Pemain terakhir bertahan
║  menang dan mendapat
║  500 XP × jumlah pemain
╟ Ketik .skata untuk join
╚═════`.trim()

const BASE_POINT = 500
const TURN_TIMEOUT = 45000
const LOBBY_TIMEOUT = 120000

let handler = async (m, { conn, usedPrefix, command, text }) => {
    conn.skata ??= {}
    const id = m.chat
    const room = conn.skata[id]

    /* =====================================================
       JIKA ROOM SUDAH ADA
    ===================================================== */
    if (room) {

        /* ===== START GAME ===== */
        if (/^start$/i.test(text)) {
            if (room.status !== 'wait')
                return m.reply('Game sudah dimulai.')

            if (!room.player.includes(m.sender))
                return m.reply('Lu belum join.')

            if (room.player.length < 2)
                return m.reply('Minimal 2 pemain.')

            room.status = 'play'
            room.curr = room.player[0]
            room.win_point = BASE_POINT * room.player.length

            room.msg = await conn.reply(
                id,
                `Giliran @${room.curr.split('@')[0]}\n\n` +
                `Mulai dari: *${room.kata.toUpperCase()}*\n` +
                `*${room.filter(room.kata).toUpperCase()}... ?*\n\n` +
                `Reply untuk menjawab\nKetik "nyerah" untuk menyerah`,
                m,
                { mentions: [room.curr] }
            )

            clearTimeout(room.timerLobby)
            startTurn(conn, id)
            return
        }

        /* ===== JOIN ===== */
        if (room.status === 'wait') {
            if (room.player.includes(m.sender))
                return m.reply('Lu sudah join.')

            room.player.push(m.sender)

            clearTimeout(room.timerLobby)
            room.timerLobby = setTimeout(() => {
                conn.reply(id, 'Game dibatalkan (tidak dimulai)')
                cleanup(conn, id)
            }, LOBBY_TIMEOUT)

            const list = room.player
                .map((v, i) => `${i + 1}. @${v.split('@')[0]}`)
                .join('\n')

            room.msg = await conn.reply(
                id,
                `╔═〘 Daftar Player 〙\n${list}\n╚════\n\n` +
                `Ketik *${usedPrefix + command} start* untuk mulai`,
                m,
                { mentions: room.player }
            )
            return
        }

        /* ===== STATUS PLAY ===== */
        return m.reply('Game sedang berlangsung.')
    }

    /* =====================================================
       BUAT ROOM BARU
    ===================================================== */
    const kata = await genKata()
    const msg = await conn.reply(id, `${GAME_INFO}\n\n${RULES}`, m)

    conn.skata[id] = {
        id,
        status: 'wait',
        msg,
        player: [m.sender],
        curr: '',
        kata,
        eliminated: [],
        basi: [],
        win_point: 0,
        timer: null,
        timerLobby: setTimeout(() => {
            conn.reply(id, 'Game dibatalkan (tidak dimulai)')
            cleanup(conn, id)
        }, LOBBY_TIMEOUT),
        filter
    }
}

handler.help = ['sambungkata']
handler.tags = ['game']
handler.command = /^s(ambung)?kata$/i
handler.group = true

export default handler

/* =====================================================
   GAME LOGIC
===================================================== */

function startTurn(conn, id) {
    const room = conn.skata[id]
    if (!room) return

    clearTimeout(room.timer)
    room.timer = setTimeout(async () => {
        const loser = room.curr
        room.eliminated.push(loser)
        room.player = room.player.filter(v => v !== loser)

        await conn.reply(
            id,
            `Waktu habis!\n@${loser.split('@')[0]} tereliminasi`,
            room.msg,
            { mentions: [loser] }
        )

        if (room.player.length === 1) {
            const winner = room.player[0]
            const user = global.rpg.data.user[winner] ??= { exp: 0 }
            user.exp += room.win_point

            await conn.reply(
                id,
                `@${winner.split('@')[0]} MENANG 🎉\n+${room.win_point} XP`,
                room.msg,
                { mentions: [winner] }
            )

            cleanup(conn, id)
            return
        }

        room.curr = room.player[0]
        conn.reply(
            id,
            `Giliran @${room.curr.split('@')[0]}\n` +
            `*${room.filter(room.kata).toUpperCase()}... ?*`,
            room.msg,
            { mentions: [room.curr] }
        )

        startTurn(conn, id)
    }, TURN_TIMEOUT)
}

function cleanup(conn, id) {
    const room = conn.skata[id]
    if (!room) return
    clearTimeout(room.timer)
    clearTimeout(room.timerLobby)
    delete conn.skata[id]
}

/* =====================================================
   UTIL
===================================================== */

async function genKata() {
    let json = skata.kata()
    let kata = json.kata
    while (kata.length < 3 || kata.length > 7) {
        json = skata.kata()
        kata = json.kata
    }
    return kata
}

function filter(text) {
    const mati = ["q","w","r","t","y","p","s","d","f","g","h","j","k","l","z","x","c","v","b","n","m"]
    if (text.length < 3) return text

    if (/([qwrtypsdfghjklzxcvbnm][qwrtypsdfhjklzxcvbnm])$/.test(text))
        return text.slice(-1)

    if (/([qwrtypsdfghjklzxcvbnm][aiueo]ng)$/.test(text))
        return text.slice(-3)

    if (/([aiueo][aiueo]([qwrtypsdfghjklzxcvbnm]|ng)?)$/i.test(text))
        return text.endsWith('ng') ? text.slice(-3) : text.slice(-1)

    const last = [...text].reverse().find(v => mati.includes(v))
    return last ? text.slice(text.lastIndexOf(last)) : text.slice(-1)
}