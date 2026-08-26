/**
 * @file Cek aktivitas member grup & kick sider
 * @module plugins/group/sider
 * @description Menampilkan member tidak aktif > 24 jam, dan opsi kick
 */

const DAY = 24 * 60 * 60 * 1000; // 24 jam

let handler = async (m, { groupMetadata, conn, command, usedPrefix, args }) => {
    if (!m.isGroup) return m.reply('❌ Khusus grup!');
    
    // Deteksi mode
    const isOutsider = /out/.test(command);
    
    await global.loading(m, conn);

    const users = global.rpg?.data?.user || {};
    const now = Date.now();
    const meta = groupMetadata || await conn.groupMetadata(m.chat);

    // Ambil semua member
    const allMembers = meta.participants.map(p => p.id);
    
    // Untuk outsider: semua member KECUALI BOT
    const members = isOutsider 
        ? allMembers.filter(jid => jid !== conn.user.jid)
        : allMembers;

    if (!members.length) {
        await global.loading(m, conn, true);
        return m.reply('📭 Tidak ada member yang bisa diproses.');
    }

    let sider = [];
    let report = [];

    for (const jid of members) {
        const user = users[jid];

        if (!user || !user.lastgc) {
            report.push({
                jid,
                lastgc: 0,
                status: '❌ Tidak pernah chat'
            });
            if (isOutsider) sider.push(jid);
            continue;
        }

        const diff = now - user.lastgc;
        const time = formatDuration(diff);

        if (diff >= DAY) {
            sider.push(jid);
            report.push({
                jid,
                lastgc: user.lastgc,
                status: `⚠️ ${time} lalu (SIDER)`
            });
        } else {
            report.push({
                jid,
                lastgc: user.lastgc,
                status: `✅ ${time} lalu`
            });
        }
    }

    if (!report.length) {
        await global.loading(m, conn, true);
        return m.reply('📭 Tidak ada data aktivitas member.');
    }

    // SORTING: TERBARU → TERLAMA
    report.sort((a, b) => {
        if (a.lastgc === 0) return 1;
        if (b.lastgc === 0) return -1;
        return b.lastgc - a.lastgc;
    });

    // Buat teks laporan
    let text = `📊 *AKTIVITAS MEMBER GRUP*\n`;
    text += `╔═══════════════════════════════╗\n`;
    text += `📅 *${meta.subject || 'Grup'}*\n`;
    text += `👥 Total member: ${members.length}\n`;
    text += `⏱️ Batas sider: *24 jam*\n`;
    text += `⚠️ Sider terdeteksi: *${sider.length}* member\n`;
    text += `╚═══════════════════════════════╝\n\n`;

    // Tampilkan semua member (maksimal 50)
    const maxDisplay = 50;
    const displayReport = report.slice(0, maxDisplay);
    
    displayReport.forEach((v, i) => {
        const rank = i + 1;
        const mention = `@${v.jid.split('@')[0]}`;
        text += `${rank}. ${mention}\n`;
        text += `   ▸ ${v.status}\n\n`;
    });

    if (report.length > maxDisplay) {
        text += `... dan ${report.length - maxDisplay} member lainnya\n\n`;
    }

    // MODE KICK (outsider)
    if (isOutsider) {
        // Jika tidak ada sider
        if (!sider.length) {
            await global.loading(m, conn, true);
            text += `━━━━━━━━━━━━━━━━━━━━━━\n`;
            text += `✅ *Tidak ada member SIDER di grup ini!*\n`;
            text += `🎉 Semua member aktif dalam 24 jam terakhir.`;
            return conn.sendMessage(m.chat, {
                text: text.trim(),
                mentions: report.map(v => v.jid)
            });
        }

        // CEK KONFIRMASI: args[0] harus 'yes'
        const isConfirmed = args && args[0] && args[0].toLowerCase() === 'yes';
        
        if (!isConfirmed) {
            await global.loading(m, conn, true);
            
            let confirmText = text;
            confirmText += `━━━━━━━━━━━━━━━━━━━━━━\n`;
            confirmText += `⚠️ *KONFIRMASI KICK SIDER*\n\n`;
            confirmText += `🔴 Akan mengeluarkan *${sider.length}* member SIDER:\n\n`;
            
            // Tampilkan 10 sider pertama
            const showSider = sider.slice(0, 10);
            showSider.forEach((jid, i) => {
                const participant = meta.participants.find(p => p.id === jid);
                const name = participant?.notify || participant?.pushName || jid.split('@')[0];
                const isAdmin = participant?.admin ? ' [Admin]' : '';
                confirmText += `${i + 1}. @${jid.split('@')[0]} (${name})${isAdmin}\n`;
            });
            
            if (sider.length > 10) {
                confirmText += `... dan ${sider.length - 10} lainnya\n`;
            }
            
            confirmText += `\n📌 Ketik *${usedPrefix}outsider yes* untuk konfirmasi kick.\n`;
            confirmText += `⚠️ *Tindakan ini tidak bisa dibatalkan!*`;
            
            return conn.sendMessage(m.chat, {
                text: confirmText.trim(),
                mentions: [...report.map(v => v.jid), ...sider.slice(0, 10)]
            });
        }

        // ===== EKSEKUSI KICK =====
        let kicked = 0;
        let failed = [];

        for (const jid of sider) {
            try {
                await conn.groupParticipantsUpdate(m.chat, [jid], 'remove');
                kicked++;
                await conn.delay(2000);
            } catch (e) {
                failed.push(jid);
                console.error(`Gagal kick ${jid}:`, e.message);
            }
        }

        await global.loading(m, conn, true);

        // Hasil kick
        let resultText = `✅ *EKSEKUSI SIDER SELESAI!*\n\n`;
        resultText += `👢 Berhasil dikeluarkan: *${kicked}* member\n`;
        
        if (failed.length) {
            resultText += `❌ Gagal dikeluarkan: *${failed.length}* member\n`;
            resultText += `📌 Mungkin bot bukan admin atau ada kendala teknis.\n\n`;
            failed.forEach((jid, i) => {
                const participant = meta.participants.find(p => p.id === jid);
                const name = participant?.notify || participant?.pushName || jid.split('@')[0];
                resultText += `${i + 1}. @${jid.split('@')[0]} (${name})\n`;
            });
        } else {
            const activeMembers = members.length - sider.length;
            resultText += `🎉 *Semua sider berhasil dikeluarkan!*\n`;
            resultText += `📊 Total member: ${members.length}\n`;
            resultText += `✅ Member aktif tersisa: ${activeMembers}`;
        }

        return conn.sendMessage(m.chat, {
            text: resultText.trim(),
            mentions: failed
        });
    }

    // Footer untuk mode sider (tanpa kick)
    if (sider.length > 0) {
        text += `━━━━━━━━━━━━━━━━━━━━━━\n`;
        text += `🔴 *${sider.length} member SIDER terdeteksi!*\n`;
        text += `📌 Gunakan *${usedPrefix}outsider* untuk mengeluarkan semua sider.\n`;
        text += `⚠️ *Hanya admin + bot admin!*\n`;
    } else {
        text += `━━━━━━━━━━━━━━━━━━━━━━\n`;
        text += `✅ *Tidak ada member SIDER di grup ini!*\n`;
        text += `🎉 Semua member aktif!`;
    }

    await global.loading(m, conn, true);

    await conn.sendMessage(m.chat, {
        text: text.trim(),
        mentions: report.map(v => v.jid)
    });
};

handler.help = ['sider', 'outsider'];
handler.tags = ['group'];
handler.command = /^(sider|outsider)$/i;
handler.group = true;
handler.admin = false;
handler.botAdmin = false;
handler.desc = [
    'Menampilkan waktu terakhir chat seluruh member grup.',
    'Diurutkan dari yang paling baru chat sampai yang paling lama.',
    'Member yang tidak aktif lebih dari 24 jam dianggap SIDER.',
    'Gunakan `outsider` untuk langsung mengeluarkan sider (admin only).'
];

export default handler;

// ===== HELPER =====
function formatDuration(ms) {
    if (ms < 1000) return 'baru saja';
    
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    const d = Math.floor(h / 24);

    if (d > 0) return `${d} hari ${h % 24} jam`;
    if (h > 0) return `${h} jam ${m % 60} menit`;
    if (m > 0) return `${m} menit`;
    return `${s} detik`;
}