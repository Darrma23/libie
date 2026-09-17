import axios from 'axios'
import { fileTypeFromBuffer } from 'file-type'

const API_KEY = '0bdb66793aeb20d3927d871be2a9ca91'
const BASE_URL = 'https://api.convertio.co'

let handler = async (m, { conn, args, usedPrefix, command }) => {
    if (!args[0]) return m.reply(
        `╭─「 *CONVERTIO* 」
        │ Konversi file via API Convertio
        │ 300+ format didukung
        ╰────

        *📌 Cara Pakai:*
        • ${usedPrefix}${command} <format> <url>
        • ${usedPrefix}${command} <format> _(reply file)_

        *📝 Contoh:*
        • ${usedPrefix}${command} png https://example.com/foto.jpg
        • ${usedPrefix}${command} pdf _(reply ke gambar)_
        • ${usedPrefix}${command} mp3 _(reply ke video)_
        • ${usedPrefix}${command} docx _(reply ke pdf)_

        *📄 Format Populer:*
        ┌ *Dokumen*
        │ pdf, docx, doc, txt, rtf, csv, xlsx, xls, pptx, epub
        ├ *Gambar*
        │ png, jpg, jpeg, webp, gif, bmp, svg, tiff, ico
        ├ *Audio*
        │ mp3, wav, ogg, m4a, flac, aac
        ├ *Video*
        │ mp4, avi, mkv, mov, webm, flv, gif
        └ *Arsip*
        zip, rar, 7z, tar, gz

        *💡 Tips:*
        • Format tujuan tidak boleh sama dengan asal
        • File max 100 MB (free tier)
        • Kuota harian terbatas, hemat pemakaian
        • Hasil dikirim sebagai dokumen

        *⚡ Powered by:* Convertio API`
        )

    await global.loading(m, conn)

    const targetFormat = args[0].toLowerCase().replace(/^\./, '')
    const sourceUrl = args[1] || null

    try {
        let id

        if (sourceUrl) {
            if (!/^https?:\/\//i.test(sourceUrl)) throw new Error('URL tidak valid')
            ;({ id } = await startConversion({
                input: 'url',
                file: sourceUrl,
                outputformat: targetFormat
            }))
        } else {
            const q = m.quoted || m.getQuotedObj?.() || null
            if (!q) throw new Error('Kirim URL atau *reply* ke file.')

            const media = await downloadQuoted(m, conn, q)
            if (!media?.length) throw new Error('Gagal mengunduh file')

            let ext = 'bin'
            const ft = await fileTypeFromBuffer(media)
            if (ft?.ext) ext = ft.ext
            else {
                const mime = q.mimetype || q.mediaMessage?.documentMessage?.mimetype
                if (mime) {
                    ext = mime.split('/')[1]?.split(';')[0] || 'bin'
                    if (ext === 'jpeg') ext = 'jpg'
                    if (ext === 'quicktime') ext = 'mov'
                }
            }

            ;({ id } = await startConversion({
                input: 'base64',
                file: Buffer.from(media).toString('base64'),
                filename: `input.${ext}`,
                outputformat: targetFormat
            }))
        }

        const maxAttempts = 40
        for (let i = 0; i < maxAttempts; i++) {
            await new Promise(r => setTimeout(r, 3000))

            let status
            try {
                const res = await axios.get(`${BASE_URL}/convert/${id}/status`, { timeout: 15000 })
                status = res.data.data
            } catch { continue }

            if (status.step === 'finish' && status.output?.url) {
                const size = formatBytes(parseInt(status.output.size) || 0)
                await conn.sendMessage(m.chat, {
                    document: { url: status.output.url },
                    fileName: `converted.${targetFormat}`,
                    mimetype: getMime(targetFormat),
                    caption:
                        `✅ *Konversi Berhasil*\n\n` +
                        `📄 Format : ${targetFormat.toUpperCase()}\n` +
                        `📦 Ukuran : ${size}\n` +
                        `⏱️ Menit  : ${status.minutes || 1}`
                }, { quoted: m })

                axios.delete(`${BASE_URL}/convert/${id}`).catch(() => {})
                return
            }

            if (status.step === 'failed') throw new Error('Konversi gagal di Convertio')
        }

        throw new Error('Waktu habis, coba lagi nanti')

    } catch (e) {
        return m.reply(`❌ *Gagal:* ${e.message}`)
    } finally {
        await global.loading(m, conn, true)
    }
}

/* ============= DOWNLOAD ============= */
async function downloadQuoted(m, conn, q) {
    if (typeof conn.downloadM === 'function') {
        try { const b = await conn.downloadM(q, 'document'); if (b?.length) return b } catch {}
    }
    if (typeof q.download === 'function') {
        try { const b = await q.download(); if (b?.length) return b } catch {}
    }
    if (typeof m.download === 'function') {
        try { const b = await m.download(); if (b?.length) return b } catch {}
    }
    try {
        const { downloadContentFromMessage } = await import('@whiskeysockets/baileys')
        const msg = q.msg || q.vM?.message || q.message
        const type = Object.keys(msg || {}).find(k => k.endsWith('Message'))
        if (type) {
            const stream = await downloadContentFromMessage(msg[type], type.replace('Message', '').toLowerCase())
            const chunks = []
            for await (const c of stream) chunks.push(c)
            return Buffer.concat(chunks)
        }
    } catch {}
    throw new Error('Semua metode download gagal')
}

/* ============= CONVERTIO ============= */
async function startConversion(payload) {
    const res = await axios.post(`${BASE_URL}/convert`, { apikey: API_KEY, ...payload },
        { headers: { 'Content-Type': 'application/json' }, timeout: 60000 })
    if (res.data.status !== 'ok') throw new Error(res.data.error || 'Request gagal')
    return res.data.data
}

/* ============= UTIL ============= */
function formatBytes(b) {
    if (!b) return '0 B'
    const k = 1024, s = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(b) / Math.log(k))
    return parseFloat((b / Math.pow(k, i)).toFixed(2)) + ' ' + s[i]
}

function getMime(ext) {
    const map = {
        png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp',
        gif: 'image/gif', svg: 'image/svg+xml', bmp: 'image/bmp',
        pdf: 'application/pdf',
        docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        doc: 'application/msword', xls: 'application/vnd.ms-excel',
        txt: 'text/plain', csv: 'text/csv', rtf: 'application/rtf',
        mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg', m4a: 'audio/mp4',
        mp4: 'video/mp4', avi: 'video/x-msvideo', mkv: 'video/x-matroska', mov: 'video/quicktime',
        zip: 'application/zip', rar: 'application/vnd.rar',
        epub: 'application/epub+zip'
    }
    return map[ext] || 'application/octet-stream'
}

handler.help = ['convertio <format> [url?]']
handler.tags = ['tools']
handler.command = /^convertio$/i
handler.desc = [
    "Konversi file dari URL atau reply ke format lain",
    "Pakai API Convertio (300+ format)",
    "Contoh: .convertio png https://example.com/img.jpg",
    "Bisa juga reply file lalu ketik .convertio pdf",
    "Hasil dikirim sebagai dokumen"
]

export default handler