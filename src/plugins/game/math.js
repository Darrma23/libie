const modes = {
    noob: [-3, 3, -3, 3, '+-', 15000, 10],
    easy: [-10, 10, -10, 10, '*/+-', 20000, 40],
    medium: [-40, 40, -20, 20, '*/+-', 40000, 150],
    hard: [-100, 100, -70, 70, '*/+-', 60000, 350],
    extreme: [-999999, 999999, -999999, 999999, '*/', 30000, 9999],
    impossible: [-99999999999, 99999999999, -99999999999, 999999999999, '*/', 30000, 35000],
    impossible2: [-999999999999999, 999999999999999, -999, 999, '/', 30000, 50000]
}

const operators = {
    '+': '+',
    '-': '-',
    '*': '×',
    '/': '÷'
}

let handler = async (m, { conn, args, usedPrefix }) => {
    conn.math ??= {}
    const id = m.chat

    if (!args[0]) {
        return m.reply(
            `Mode: ${Object.keys(modes).join(' | ')}\n\n` +
            `Contoh penggunaan: ${usedPrefix}math medium`
        )
    }

    const mode = args[0].toLowerCase()
    if (!(mode in modes)) {
        return m.reply(
            `Mode: ${Object.keys(modes).join(' | ')}\n\n` +
            `Contoh penggunaan: ${usedPrefix}math medium`
        )
    }

    if (conn.math[id]) {
        return conn.reply(
            m.chat,
            'Masih ada soal belum terjawab di chat ini',
            conn.math[id].msg
        )
    }

    const math = genMath(mode)

    const msg = await conn.reply(
        m.chat,
        `Berapa hasil dari *${math.str}*?\n\n` +
        `Timeout: ${(math.time / 1000).toFixed(2)} detik\n` +
        `Bonus Jawaban Benar:\n` +
        `${math.bonus} XP\n` +
        `1 TiketCoin`,
        m
    )

    const timer = setTimeout(() => {
        if (!conn.math[id]) return
        conn.reply(
            m.chat,
            `Waktu habis!\nJawabannya adalah *${math.result}*`,
            msg
        )
        delete conn.math[id]
    }, math.time)

    conn.math[id] = {
        msg,
        soal: math,
        point: math.bonus,
        tiket: 1,
        timer
    }
}

handler.help = ['math']
handler.tags = ['game']
handler.command = /^math$/i
handler.limit = true
handler.group = true

export default handler

function genMath(mode) {
    const [a1, a2, b1, b2, ops, time, bonus] = modes[mode]

    let a = randomInt(a1, a2)
    let b = randomInt(b1, b2)
    let op = pickRandom([...ops])

    // hitung hasil asli
    let result = new Function(
        `return ${a} ${op} ${b < 0 ? `(${b})` : b}`
    )()

    // khusus pembagian biar hasilnya masuk akal
    if (op === '/') {
        result = a
        a = result * b
    }

    return {
        str: `${a} ${operators[op]} ${b}`,
        mode,
        time,
        bonus,
        result
    }
}

function randomInt(from, to) {
    if (from > to) [from, to] = [to, from]
    from = Math.floor(from)
    to = Math.floor(to)
    return Math.floor(Math.random() * (to - from + 1)) + from
}

function pickRandom(list) {
    return list[Math.floor(Math.random() * list.length)]
}