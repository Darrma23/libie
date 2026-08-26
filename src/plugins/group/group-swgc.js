/**
 * @file Kirim pesan sebagai status grup
 * @module plugins/group/swgc
 * @description Mengirim pesan yang di-reply sebagai status grup
 * @author Himejima
 */

let handler = async (m, { conn, args, usedPrefix, command }) => {
    // Validasi: hanya di grup
    if (!m.isGroup) {
        return m.reply('❌ Khusus grup!');
    }

    // Validasi: harus admin
    const groupMetadata = await conn.groupMetadata(m.chat);
    const isAdmin = groupMetadata.participants.some(p => p.id === m.sender && p.admin);
    
    if (!isAdmin) {
        return m.reply('❌ Perintah ini hanya untuk admin grup!');
    }

    // ==========================================
    // ✅ CEK APAKAH ADA REPLY & ARGUMEN
    // ==========================================
    if (!m.quoted && !args.length) {
        return m.reply(
            `📌 *Cara penggunaan .swgc*\n\n` +
            `1. Reply pesan (teks/gambar/video) yang mau dijadikan status\n` +
            `2. Tambahkan teks/emoji (opsional)\n\n` +
            `*Contoh:*\n` +
            `${usedPrefix + command} Selamat pagi! | 🌅 (reply pesan)\n\n` +
            `*Atau tanpa teks:*\n` +
            `${usedPrefix + command} (reply pesan)`
        );
    }

    // Jika ada argumen tapi tidak ada reply
    if (args.length && !m.quoted) {
        return m.reply(
            `❌ *Harus reply pesan!*\n\n` +
            `Reply pesan yang mau dijadikan status grup.\n\n` +
            `*Contoh:*\n` +
            `${usedPrefix + command} Selamat pagi! | 🌅 (reply pesan)`
        );
    }

    try {
        await global.loading(m, conn);

        // ==========================================
        // ✅ AMBIL DATA PESAN YANG DI-REPLY
        // ==========================================
        const quoted = m.quoted;
        
        // Cari pesan dari berbagai kemungkinan struktur
        let msgData = null;
        let msgType = null;
        let captionText = '';
        let isMedia = false;

        // 1. Cek di mediaMessage (untuk media)
        if (quoted.mediaMessage) {
            const mediaKeys = Object.keys(quoted.mediaMessage);
            for (const key of mediaKeys) {
                if (key.endsWith('Message')) {
                    msgType = key;
                    msgData = quoted.mediaMessage[key];
                    captionText = msgData.caption || msgData.title || msgData.fileName || '';
                    isMedia = true;
                    break;
                }
            }
        }

        // 2. Cek di msg (untuk reply teks biasa)
        if (!msgData && quoted.msg) {
            const msgKeys = Object.keys(quoted.msg);
            for (const key of msgKeys) {
                if (key.endsWith('Message') && key !== 'messageContextInfo') {
                    msgType = key;
                    msgData = quoted.msg[key];
                    captionText = msgData.text || msgData.caption || msgData.title || msgData.fileName || '';
                    break;
                }
            }
        }

        // 3. Cek langsung di quoted
        if (!msgData) {
            const keys = Object.keys(quoted);
            for (const key of keys) {
                if (key.endsWith('Message') && key !== 'messageContextInfo' && key !== 'mediaMessage') {
                    msgType = key;
                    msgData = quoted[key];
                    captionText = msgData.text || msgData.caption || msgData.title || msgData.fileName || '';
                    break;
                }
            }
        }

        // 4. Fallback: conversation
        if (!msgData && quoted.conversation) {
            msgType = 'conversation';
            msgData = { text: quoted.conversation };
            captionText = quoted.conversation;
        }

        if (!msgData || !msgType) {
            return m.reply('❌ Tipe pesan tidak dikenali! Support: teks, gambar, video, dokumen, audio, stiker.');
        }

        // ==========================================
        // ✅ PARSE INPUT: "teks | emoji"
        // ==========================================
        const input = args.join(' ').trim();
        let listName = '';
        let listEmoji = '';

        if (input) {
            const parts = input.split('|').map(s => s.trim());
            listName = parts[0] || '';
            listEmoji = parts[1] || '';
        }

        // ==========================================
        // ✅ BUILD PESAN STATUS
        // ==========================================
        let statusText = '';

        // Jika media, ambil captionnya
        if (isMedia && captionText) {
            statusText = captionText;
        } else if (captionText) {
            statusText = captionText;
        } else {
            statusText = '📢 Status Grup';
        }

        // Gabungkan dengan input user
        if (listName) {
            statusText = listName + '\n\n' + statusText;
        }
        if (listEmoji) {
            statusText = listEmoji + ' ' + statusText;
        }

        // ==========================================
        // ✅ KIRIM SEBAGAI STATUS GRUP
        // ==========================================
        const statusMessage = {
            extendedTextMessage: {
                text: statusText,
                contextInfo: {
                    statusAudienceMetadata: {
                        audienceType: 2,
                        ...(listName ? { listName } : {}),
                        ...(listEmoji ? { listEmoji } : {})
                    },
                    mentionedJid: [m.sender]
                }
            }
        };

        await conn.sendMessage(
            m.chat,
            {
                groupStatusMessageV2: {
                    message: statusMessage
                }
            },
            {
                customNodes: [
                    {
                        tag: 'meta',
                        attrs: { is_group_status: 'true' }
                    }
                ],
                additionalAttributes: { type: 'text' },
                quoted: m
            }
        );

        // Reaksi sukses
        await conn.sendMessage(m.chat, {
            react: { key: m.key, text: '✅' }
        });

    } catch (error) {
        console.error('Error swgc:', error);
        m.reply(`❌ Gagal mengirim status grup: ${error.message || 'Unknown error'}`);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ['swgc'];
handler.tags = ['group'];
handler.command = /^(swgc)$/i;
handler.group = true;
handler.admin = true;
handler.desc = [
    'Kirim pesan (teks/gambar/video) sebagai status grup',
    'Wajib reply pesan yang mau dijadikan status',
    'Format: .swgc [teks|emoji] (reply pesan)'
];

export default handler;