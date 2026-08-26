/**
 * @file Downloader Facebook Video
 * @module plugins/downloader/facebook
 * @description Download video dari Facebook
 * @author Himejima
 */

import axios from "axios";

let handler = async (m, { conn, args, usedPrefix, command }) => {
    if (!args[0]) {
        return m.reply(
            `📌 *Cara penggunaan:*\n` +
            `${usedPrefix + command} <url facebook>\n\n` +
            `*Contoh:*\n` +
            `${usedPrefix + command} https://www.facebook.com/share/v/1HacQQYocw/\n\n` +
            `*Support:*\n` +
            `- Video Facebook\n` +
            `- Kualitas SD & HD`
        );
    }

    // Validasi URL Facebook
    const url = args[0];
    if (!url.includes('facebook.com') && !url.includes('fb.watch')) {
        return m.reply('❌ URL tidak valid! Masukkan link Facebook.');
    }

    await global.loading(m, conn);

    try {
        // Encode URL
        const encodedUrl = encodeURIComponent(url);
        const apiUrl = `https://api.azbry.com/api/download/facebook?url=${encodedUrl}`;

        const response = await axios.get(apiUrl, {
            timeout: 30000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        if (!response.data.status || !response.data.result) {
            return m.reply('❌ Gagal mengambil video. Coba lagi nanti.');
        }

        const data = response.data.result;
        const medias = data.medias || [];

        if (!medias.length) {
            return m.reply('❌ Tidak ada video yang ditemukan.');
        }

        // Cari video dengan kualitas terbaik (HD > SD)
        let video = medias.find(v => v.quality === 'hd') || medias[0];

        // Kirim video + caption dalam 1 pesan
        await conn.sendMessage(
            m.chat,
            {
                video: { url: video.url },
                caption: `📹 *Facebook Video*\n📌 ${data.title || 'Facebook Video'}\n📊 Kualitas: ${video.quality || 'unknown'}\n📦 Ukuran: ${video.formattedSize || 'Tidak diketahui'}`,
                mimetype: 'video/mp4'
            },
            { quoted: m }
        );

    } catch (error) {
        console.error('Error Facebook downloader:', error);
        m.reply(`❌ Gagal mendownload video.\n\n${error.message || 'Unknown error'}`);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ['fb', 'facebook'];
handler.tags = ['downloader'];
handler.command = /^(fb|facebook)$/i;
handler.desc = [
    'Download video dari Facebook (otomatis kualitas terbaik)',
    'Format: .fb <url facebook>',
    'Contoh: .fb https://www.facebook.com/share/v/1HacQQYocw/'
];

export default handler;