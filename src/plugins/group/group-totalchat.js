// src/plugins/group/totalchat-top.js
// Versi ULTRA KEREN dengan badge, progress bar █░, dan statistik lengkap

let handler = async (m, { conn, args, usedPrefix, command, isOwner, isAdmin, isRowner, participants, groupMetadata }) => {
    if (!m.isGroup) return m.reply('❌ Khusus grup!');
    
    // Parse argumen untuk jumlah top yang ditampilkan (default 10)
    let limit = parseInt(args[0]) || 10;
    if (limit > 20) limit = 20; // Maksimal 20
    if (limit < 3) limit = 3; // Minimal 3

    let meta = groupMetadata || await conn.groupMetadata(m.chat);
    let participantsList = participants || meta?.participants || [];

    // Ambil data chat
    let chatCounts = {};
    let totalAll = 0;
    let memberWithChat = 0;

    for (let p of participantsList) {
        let jid = p.id || p.jid;
        if (!jid) continue;
        try {
            let user = global.rpg?.data?.user?.[jid];
            let count = user?.chat_count || 0;
            chatCounts[jid] = count;
            totalAll += count;
            if (count > 0) memberWithChat++;
        } catch (e) {
            chatCounts[jid] = 0;
        }
    }

    let memberStats = participantsList
        .map(p => {
            let id = p.id || p.jid;
            let count = chatCounts[id] || 0;
            let name = p.name || p.notify || p.pushName || id?.split('@')[0] || 'Unknown';
            return { id, name, count };
        })
        .sort((a, b) => b.count - a.count);

    let topMembers = memberStats.filter(m => m.count > 0);
    let mentions = [];
    let totalTop = Math.min(limit, topMembers.length);

    // HEADER
    let reportText = `🌟 *L E A D E R B O A R D   C H A T* 🌟\n`;
    reportText += `╔═══════════════════════════════╗\n`;
    reportText += `📅 *${meta?.subject || 'Grup'}*\n`;
    reportText += `👥 ${participantsList.length} member • 💬 ${totalAll} total chat\n`;
    reportText += `📊 ${memberWithChat} member aktif (${Math.round((memberWithChat/participantsList.length)*100)}%)\n`;
    reportText += `╚═══════════════════════════════╝\n\n`;

    if (topMembers.length === 0) {
        reportText += `📭 *Belum ada aktivitas chat di grup ini*\n`;
        reportText += `💡 Kirim pesan dulu biar kehitung!`;
    } else {
        // BADGE EMOJI
        const medals = ['👑', '🥇', '🥈', '🥉'];
        const rankEmojis = ['🔥', '⚡', '💫', '🌟', '✨', '🎯', '💪', '🚀', '🎮', '🏅'];
        
        reportText += `🏆 *TOP ${totalTop} CHATTER* 🏆\n`;
        reportText += `┌─────────────────────────────┐\n`;

        topMembers.slice(0, totalTop).forEach((member, i) => {
            let rank = i + 1;
            let medal = medals[i] || rankEmojis[i % rankEmojis.length];
            
            // Format tag dengan mention
            let tag = `@${member.id.split('@')[0]}`;
            
            // Progress bar █░ (TETAP SEPERTI SEBELUMNYA)
            let maxCount = topMembers[0]?.count || 1;
            let percentage = Math.round((member.count / maxCount) * 100);
            let barLength = Math.round((member.count / maxCount) * 10);
            let bar = '█'.repeat(barLength) + '░'.repeat(10 - barLength);
            
            // Format pesan dengan padding
            let countStr = String(member.count).padStart(4, ' ');
            let rankStr = String(rank).padStart(2, ' ');
            
            reportText += `│ ${rankStr}. ${medal} ${tag}\n`;
            reportText += `│    📝 ${countStr} pesan ${bar} ${percentage}%\n`;
            
            // Tambahan efek untuk top 3
            if (rank <= 3) {
                let crown = ['👑', '🥇', '🥈'][rank-1];
                reportText += `│    ${crown} *Peringkat ${rank}*\n`;
            }
            
            reportText += `├─────────────────────────────┤\n`;
            mentions.push(member.id);
        });

        // STATISTIK BAWAH
        let avg = Math.round(totalAll / memberWithChat);
        let mostActive = topMembers[0];
        let leastActive = topMembers[topMembers.length - 1];
        
        reportText += `\n📊 *STATISTIK CHAT*\n`;
        reportText += `┌─────────────────────────────┐\n`;
        reportText += `│ 🏅 Chat Terbanyak: ${mostActive.count} pesan\n`;
        reportText += `│ 📉 Chat Tersedikit: ${leastActive.count} pesan\n`;
        reportText += `│ 📊 Rata-rata: ${avg} pesan/member\n`;
        reportText += `│ 💪 Total Chat: ${totalAll} pesan\n`;
        reportText += `└─────────────────────────────┘\n`;

        // PESAN MOTIVASI
        if (topMembers.length < participantsList.length) {
            let inactive = participantsList.length - memberWithChat;
            reportText += `\n📢 *${inactive} member belum chat!*\n`;
            reportText += `💬 Ayo lebih aktif biar masuk leaderboard!`;
        }
    }

    // FOOTER
    reportText += `\n\n━━━━━━━━━━━━━━━━━━━━━━\n`;
    reportText += `📌 *Command:* ${usedPrefix + command} [jumlah]\n`;
    reportText += `📌 *Contoh:* ${usedPrefix + command} 5 (top 5)`;

    // Kirim dengan mention
    await conn.sendMessage(m.chat, {
        text: reportText,
        mentions: mentions
    });
};

// Konfigurasi command
handler.help = ['topchat', 'leaderboard'];
handler.tags = ['group'];
handler.command = /^(topchat|leaderboard|lbchat)$/i;
handler.group = true;
handler.desc = [
    'Menampilkan leaderboard chat grup dengan visual keren',
    'Bisa tentukan jumlah top (contoh: !topchat 5)',
    'Menampilkan progress bar, statistik, dan ranking'
];

export default handler;