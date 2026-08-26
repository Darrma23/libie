/**
 * @file Control bot response mode in chat
 * @module plugins/group/botmode
 * @description Mengontrol mode respons bot di chat (mute/unmute)
 * @author Himejima
 */

let handler = async (m, { text, usedPrefix, command }) => {
    // Ambil data chat dari rowCaches
    const chatKey = `chats:${m.chat}`;
    const chatCache = global.db?.rowCaches?.chats?.cache;
    
    if (!chatCache) {
        return m.reply('❌ Database tidak tersedia!');
    }

    // Ambil data chat dari cache
    let chat = chatCache.get(chatKey);
    
    // Jika belum ada, buat baru
    if (!chat) {
        chat = {
            jid: m.chat,
            mute: 0,
            isGroup: m.isGroup ? 1 : 0,
            name: m.isGroup ? 'Group' : null,
            lastActivity: Date.now(),
            expired: 0
        };
        chatCache.set(chatKey, chat);
    }

    if (!text) {
        const status = chat.mute ? "OFF" : "ON";
        return m.reply(`Bot: ${status}\nUse: ${usedPrefix + command} on/off`);
    }

    switch (text.toLowerCase()) {
        case "off":
        case "mute":
            if (chat.mute) return m.reply("Already OFF");
            chat.mute = 1;
            chatCache.set(chatKey, chat);
            return m.reply("Bot OFF");

        case "on":
        case "unmute":
            if (!chat.mute) return m.reply("Already ON");
            chat.mute = 0;
            chatCache.set(chatKey, chat);
            return m.reply("Bot ON");

        default:
            return m.reply(`Invalid\nUse: ${usedPrefix + command} on/off`);
    }
};

handler.help = ["botmode"];
handler.tags = ["group"];
handler.command = /^(bot(mode)?)$/i;
handler.owner = true;
handler.desc = [
    'Mengontrol mode respons bot di chat (ON/OFF)',
    'Bot akan ignore semua perintah jika OFF',
    'Hanya owner yang bisa menggunakan'
];

export default handler;