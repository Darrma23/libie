let handler = async (m, { text, conn }) => {
    let user = global.rpg.data.user[m.sender];
    if (!user) return m.reply('❌ Kamu belum terdaftar!');
    
    // Cek apakah user sudah AFK
    if (user.afk === 1) {
        return m.reply(`⚠️ Kamu sudah AFK!\nKirim pesan untuk kembali.`);
    }
    
    user.afk = 1;
    user.afkReason = text || '';
    user.afkTime = Date.now();
    
    let name = await conn.getName(m.sender);
    let reason = text ? 'dengan alasan ' + text : 'tanpa alasan';
    
    m.reply(`${name} sekarang AFK ${reason}`);
};

handler.command = /^afk$/i;
export default handler;