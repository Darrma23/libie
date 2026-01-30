import translate from 'translate-google-api'

const DEFAULT_LANG = 'id'

let handler = async (m, { args, usedPrefix, command }) => {
    let lang = args[0]
    let text = ''

    // ambil teks TANPA rusak enter
    if (args.length > 1) {
        text = m.text.replace(
            new RegExp(`^${usedPrefix}${command}\\s*${lang}\\s*`, 'i'),
            ''
        )
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

    if (!lang || lang.length !== 2) {
        lang = DEFAULT_LANG
    }

    try {
        const result = await translatePreserveLines(text, lang)
        m.reply(result)
    } catch {
        try {
            const fallback = await translatePreserveLines(text, DEFAULT_LANG)
            m.reply(fallback)
        } catch {
            m.reply('Gagal menerjemahkan.')
        }
    }
}

handler.help = ['translate']
handler.tags = ['tools']
handler.command = /^(tr(anslate)?)$/i

export default handler

/* =====================================================
   HELPER: JAGA TATA LETAK (ENTER, BARIS, URUTAN)
===================================================== */

async function translatePreserveLines(text, lang) {
    const lines = text.split('\n')
    const out = []

    for (const line of lines) {
        if (!line.trim()) {
            out.push('')
            continue
        }
        const res = await translate(line, { to: lang })
        out.push(res[0])
    }

    return out.join('\n')
}