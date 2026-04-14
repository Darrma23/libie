import pkg from '@vitalets/google-translate-api'
const translate = pkg.translate || pkg.default || pkg

const DEFAULT_LANG = 'id'

// escape regex biar prefix aman
function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

let handler = async (m, { args, usedPrefix, command }) => {
    let lang = args[0]
    let text = ''

    // kalau ada lebih dari 1 arg → berarti ada lang + teks
    if (args.length > 1) {
        const safePrefix = escapeRegex(usedPrefix)
        text = m.text.replace(
            new RegExp(`^${safePrefix}${command}\\s+${lang}\\s*`, 'i'),
            ''
        )
    }

    // kalau cuma 1 arg → anggap itu teks, bukan lang
    if (args.length === 1) {
        text = args[0]
        lang = DEFAULT_LANG
    }

    // fallback ke reply
    if (!text && m.quoted?.text) {
        text = m.quoted.text
    }

    if (!text) {
        return m.reply(
            `Masukkan teks atau reply pesan.\n` +
            `Contoh:\n${usedPrefix + command} en halo dunia`
        )
    }

    // validasi bahasa (lebih fleksibel)
    if (!lang || !/^[a-z-]+$/i.test(lang)) {
        lang = DEFAULT_LANG
    }

    try {
        const result = await translatePreserveLines(text, lang)
        m.reply(result)
    } catch (e) {
        console.error('Translate error:', e)
        try {
            const fallback = await translatePreserveLines(text, DEFAULT_LANG)
            m.reply(fallback)
        } catch (err) {
            console.error('Fallback error:', err)
            m.reply('Gagal menerjemahkan.')
        }
    }
}

handler.help = ['translate']
handler.tags = ['tools']
handler.command = /^(tr(anslate)?)$/i

export default handler

/* =====================================================
   HELPER: JAGA ENTER + PARALLEL BIAR GA LEMOT
===================================================== */

async function translatePreserveLines(text, lang) {
    const lines = text.split('\n')

    const results = await Promise.all(
        lines.map(line => {
            if (!line.trim()) return ''
            return translate(line, { to: lang })
                .then(res => res.text)
                .catch(() => line) // fallback per baris biar ga hilang
        })
    )

    return results.join('\n')
}