import skata from '#lib/skata.js'

let handler = m => m

handler.before = async function (m, { conn }) {

    conn.skata ??= {}

    const id = m.chat
    const room = conn.skata[id]

    if (!room) return true

    const users = global.rpg.data.user
    const bonus = Math.floor(Math.random() * 100) + 500

    for (const u of room.player) {
        users[u] ??= { exp: 0, name: u.split('@')[0] }
    }

    if (
        room.status === 'play' &&
        room.curr === m.sender &&
        /^nyerah$/i.test(m.text)
    ) {

        clearTimeout(room.timer)

        const loser = room.curr

        room.player = room.player.filter(v => v !== loser)
        room.eliminated.push(loser)

        if (room.player.length === 1) {

            const winner = room.player[0]

            users[winner].exp += room.win_point

            await conn.reply(
                id,
                `🎉 @${winner.split('@')[0]} MENANG\n+${room.win_point} XP`,
                room.chat,
                { mentions: [winner] }
            )

            delete conn.skata[id]
            return true
        }

        room.curr = room.player[0]

        await conn.reply(
            id,
            `@${loser.split('@')[0]} menyerah`,
            room.chat,
            { mentions: [loser] }
        )

        return true
    }

    if (
        room.status === 'play' &&
        room.curr === m.sender &&
        m.quoted &&
        m.text
    ) {

        const answer = m.text
            .toLowerCase()
            .split(' ')[0]
            .replace(/[^a-z]/g, '')

        if (!answer) return true

        const expected = room.filter(room.kata)

        if (!answer.startsWith(expected))
            return m.reply(`❌ Harus diawali *${expected}*`)

        const check = skata.cKata(answer)

        if (!check.status)
            return m.reply(`❌ Kata tidak valid`)

        if (room.basi.includes(answer))
            return m.reply(`❌ Kata sudah dipakai`)

        clearTimeout(room.timer)

        users[m.sender].exp += bonus

        room.basi.push(answer)
        room.win_point += 200
        room.kata = answer

        const idx = room.player.indexOf(room.curr)
        room.curr = room.player[idx + 1] ?? room.player[0]

        room.chat = await conn.reply(
            id,
            `+${bonus} XP\n` +
            `Giliran @${room.curr.split('@')[0]}\n` +
            `*${room.filter(answer).toUpperCase()}... ?*`,
            room.chat,
            { mentions: [room.curr] }
        )

        return true
    }

    return true
}

export default handler