import skata from '#lib/skata.js'

let handler = m => m

handler.before = async function (m, { conn }) {
    conn.skata ??= {}
    const id = m.chat
    const room = conn.skata[id]
    if (!room) return true

    const users = global.rpg.data.user
    const member = room.player
    const bonus = rwd(500, 600)

    // pastikan user ada
    for (const u of member) {
        users[u] ??= { exp: 0, skata: 0, name: u.split('@')[0] }
        users[u].skata ??= 0
    }

    /* =====================================================
       1️⃣ NYERAH (TIDAK PERLU REPLY)
    ===================================================== */
    if (
        room.status === 'play' &&
        room.curr === m.sender &&
        /^nyerah$/i.test(m.text)
    ) {
        clearTimeout(room.timer)

        const loser = room.curr
        const loseMMR = mmr('lose', loser)
        users[loser].skata -= loseMMR

        room.player = room.player.filter(v => v !== loser)
        room.eliminated.push(loser)

        if (room.player.length === 1) {
            const winner = room.player[0]
            users[winner].exp += room.win_point

            await conn.reply(
                id,
                `@${winner.split('@')[0]} MENANG 🎉\n+${room.win_point} XP`,
                room.chat,
                { mentions: [winner] }
            )
            cleanup(conn, id)
            return true
        }

        room.curr = room.player[0]
        room.new = true
        room.diam = true

        const msg = await conn.preSudo('nextkata', room.curr, m)
        conn.ev.emit('messages.upsert', msg)
        return true
    }

    /* =====================================================
       2️⃣ JAWABAN KATA (WAJIB REPLY)
    ===================================================== */
    if (
        room.status === 'play' &&
        room.curr === m.sender &&
        m.quoted &&          // WAJIB reply
        m.text &&
        !/nextkata/i.test(m.text)
    ) {
        const answer = m.text
            .toLowerCase()
            .split(' ')[0]
            .replace(/[^a-z]/g, '')

        if (!answer) return true

        const expected = room.filter(room.kata)
        const check = skata.cKata(answer)

        if (!answer.startsWith(expected))
            return m.reply(`❌ Harus diawali *${expected}*`)

        if (!check.status)
            return m.reply(`❌ Kata *${answer.toUpperCase()}* tidak valid`)

        if (room.basi.includes(answer))
            return m.reply(`❌ Kata sudah pernah dipakai`)

        clearTimeout(room.timer)

        users[m.sender].exp += bonus
        room.basi.push(answer)
        room.win_point += 200
        room.killer = m.sender
        room.kata = answer

        const idx = member.indexOf(room.curr)
        room.curr = member[idx + 1] ?? member[0]

        room.chat = await conn.reply(
            id,
            `+${bonus} XP\nGiliran @${room.curr.split('@')[0]}\n` +
            `*${room.filter(answer).toUpperCase()}... ?*`,
            room.chat,
            { mentions: [room.curr] }
        )

        room.new = true
        room.diam = true

        const msg = await conn.preSudo('nextkata', room.curr, m)
        conn.ev.emit('messages.upsert', msg)
        return true
    }

    /* =====================================================
       3️⃣ INTERNAL: NEXT KATA (BUKAN INPUT USER)
    ===================================================== */
    if (room.new) {
        if (!/nextkata/i.test(m.text)) return true
        room.new = false
        room.killer = null

        const { kata } = skata.kata()
        room.kata = kata

        room.chat = await conn.reply(
            id,
            `Giliran @${room.curr.split('@')[0]}\n` +
            `Mulai : *${kata.toUpperCase()}*\n` +
            `*${room.filter(kata).toUpperCase()}... ?*\n\n` +
            `"nyerah" untuk menyerah\n` +
            `XP terkumpul: ${room.win_point}\n` +
            `Tersisa:\n${member.map((v,i)=>`${i+1}. ${users[v].name}`).join('\n')}`,
            room.msg,
            { mentions: [room.curr] }
        )
        return true
    }

    /* =====================================================
       4️⃣ TIMEOUT TURN
    ===================================================== */
    if (room.diam) {
        if (!/nextkata/i.test(m.text)) return true
        room.diam = false

        clearTimeout(room.timer)
        room.timer = setTimeout(async () => {
            const loser = room.curr
            const loseMMR = mmr('lose', loser)
            const winMMR = room.killer ? mmr('win', room.killer) : 0

            users[loser].skata -= loseMMR
            if (room.killer) users[room.killer].skata += winMMR

            await conn.reply(
                id,
                `Waktu habis!\n@${loser.split('@')[0]} tereliminasi -${loseMMR} MMR` +
                (room.killer ? `\n@${room.killer.split('@')[0]} +${winMMR} MMR` : ''),
                room.chat,
                { mentions: [loser, room.killer].filter(Boolean) }
            )

            room.eliminated.push(loser)
            room.player = room.player.filter(v => v !== loser)

            if (room.player.length === 1) {
                const winner = room.player[0]
                users[winner].exp += room.win_point

                await conn.reply(
                    id,
                    `@${winner.split('@')[0]} MENANG 🎉\n+${room.win_point} XP`,
                    room.chat,
                    { mentions: [winner] }
                )
                cleanup(conn, id)
                return
            }

            room.curr = room.player[0]
            room.new = true
            room.diam = true

            const msg = await conn.preSudo('nextkata', room.curr, m)
            conn.ev.emit('messages.upsert', msg)
        }, 30000)
    }

    return true
}

export default handler

/* ================= UTIL ================= */

function rwd(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min
}

function mmr(type, jid) {
    const score = global.rpg.data.user[jid].skata
    if (type === 'win') {
        if (score > 5000) return rwd(5, 9)
        if (score > 3000) return rwd(5, 10)
        if (score > 1500) return rwd(10, 15)
        if (score > 1000) return rwd(15, 20)
        if (score > 500) return rwd(20, 30)
        return rwd(30, 50)
    } else {
        if (score > 8000) return rwd(35, 50)
        if (score > 5000) return rwd(25, 30)
        if (score > 3000) return rwd(20, 25)
        if (score > 1500) return rwd(15, 19)
        if (score > 1000) return rwd(10, 14)
        if (score > 500) return rwd(5, 9)
        return rwd(1, 5)
    }
}

function cleanup(conn, id) {
    const room = conn.skata[id]
    if (!room) return
    clearTimeout(room.timer)
    clearTimeout(room.timerLobby)
    delete conn.skata[id]
}