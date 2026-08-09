// src/plugins/maker/fotolive.js
// Convert video ke Live Photo (Foto bergerak)
// Source: https://whatsapp.com/channel/0029Vb6EHtR5Ui2gHMW9zX2x

import fs from 'fs';
import os from 'os';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import { 
    downloadContentFromMessage, 
    prepareWAMessageMedia, 
    generateWAMessageFromContent 
} from 'baileys';

let handler = async (m, { conn, isOwner }) => {
    // Validasi: cek ada video yang di-reply
    const quoted = m.quoted || m;
    const mime = quoted?.mimetype || quoted?.msg?.mimetype || '';

    if (!mime.includes('video')) {
        return m.reply('❌ *Balas/reply video* yang valid untuk dijadikan Live Photo ya kak~\n\n📌 Contoh: reply video lalu ketik `.fotolive`');
    }

    // File temporary
    const tmpDir = os.tmpdir();
    const videoPath = path.join(tmpDir, `live_video_${Date.now()}.mp4`);
    const thumbPath = path.join(tmpDir, `live_thumb_${Date.now()}.jpg`);

    try {
        // 1. Download video
        await global.loading(m, conn);

        let videoBuffer;
        
        if (typeof quoted.download === 'function') {
            videoBuffer = await quoted.download();
        } else {
            const msgObj = quoted.msg || quoted;
            if (!msgObj?.mediaKey && !msgObj?.url) {
                throw new Error('Media key tidak ditemukan');
            }
            
            const stream = await downloadContentFromMessage(msgObj, 'video');
            const chunks = [];
            for await (const chunk of stream) {
                chunks.push(chunk);
            }
            videoBuffer = Buffer.concat(chunks);
        }

        if (!videoBuffer || videoBuffer.length === 0) {
            throw new Error('Gagal mendownload video');
        }

        // 2. Simpan video sementara
        fs.writeFileSync(videoPath, videoBuffer);

        // 3. Generate thumbnail pake ffmpeg
        await new Promise((resolve, reject) => {
            ffmpeg(videoPath)
                .outputOptions(['-vframes 1', '-q:v 2'])
                .output(thumbPath)
                .on('end', resolve)
                .on('error', reject)
                .run();
        });

        // 4. Baca thumbnail
        const thumbBuffer = fs.readFileSync(thumbPath);

        // 5. Prepare media untuk diupload

        const imageMedia = await prepareWAMessageMedia(
            { image: thumbBuffer },
            { upload: conn.waUploadToServer || conn.upload }
        );

        const videoMedia = await prepareWAMessageMedia(
            { video: videoBuffer },
            { upload: conn.waUploadToServer || conn.upload }
        );

        // 6. Kirim Live Photo (Image + Video)
        const photoMsg = generateWAMessageFromContent(
            m.chat,
            {
                imageMessage: {
                    ...imageMedia.imageMessage,
                    contextInfo: { 
                        pairedMediaType: 5, 
                        statusSourceType: 0 
                    }
                }
            },
            { quoted: m }
        );

        await conn.relayMessage(m.chat, photoMsg.message, { 
            messageId: photoMsg.key.id 
        });

        await conn.relayMessage(
            m.chat,
            {
                videoMessage: {
                    ...videoMedia.videoMessage,
                    contextInfo: { 
                        pairedMediaType: 6, 
                        statusSourceType: 0 
                    }
                },
                messageContextInfo: {
                    messageAssociation: { 
                        associationType: 12, 
                        parentMessageKey: photoMsg.key 
                    }
                }
            },
            {}
        );

        // 7. Sukses
        await conn.sendMessage(m.chat, { 
            react: { text: '✅', key: m.key } 
        });

    } catch (error) {
        console.error('❌ Error fotolive:', error);
        
        await conn.sendMessage(m.chat, { 
            react: { text: '❌', key: m.key } 
        });
        
        let errorMsg = '❌ *Gagal membuat Live Photo!*\n\n';
        errorMsg += `📌 *Error:* ${error.message || 'Unknown error'}\n\n`;
        errorMsg += '💡 *Tips:*\n';
        errorMsg += '• Pastikan video tidak corrupt\n';
        errorMsg += '• Coba dengan video yang lebih pendek\n';
        errorMsg += '• Pastikan ffmpeg terinstall di server';
        
        m.reply(errorMsg);

    } finally {
        // Cleanup: hapus file temporary
        try {
            if (fs.existsSync(videoPath)) fs.unlinkSync(videoPath);
            if (fs.existsSync(thumbPath)) fs.unlinkSync(thumbPath);
        } catch (_) {
            // Silent cleanup
        }
    }
};

// Konfigurasi command
handler.help = ['fotolive', 'livephoto'];
handler.tags = ['maker', 'tools'];
handler.command = /^(fotolive|livephoto|livepic|livefoto)$/i;
handler.desc = [
    'Mengubah video menjadi Live Photo (foto bergerak)',
    'Reply video lalu ketik .fotolive',
    'Hasilnya bisa dilihat di WhatsApp dengan efek gerak'
];

export default handler;