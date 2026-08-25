// src/plugins/rpg/rpg-profile.js
// Profile dengan support premium badge + LID mapping + cache

const ppCache = new Map();

let handler = async (m, { conn, text, usedPrefix, command }) => {
    function no(number) {
        return number.replace(/\s/g, '').replace(/([@+-])/g, '');
    }

    text = no(text);

    let who;
    if (text) {
        if (text.includes('@')) {
            who = text + '@s.whatsapp.net';
        } else {
            who = text + '@s.whatsapp.net';
        }
    } else if (m.quoted && m.quoted.sender) {
        who = m.quoted.sender;
    } else if (m.mentionedJid && m.mentionedJid[0]) {
        who = m.mentionedJid[0];
    } else {
        who = m.sender;
    }

    if (!who) return m.reply('❌ Gagal menentukan target!');

    let defaultAvatar = 'https://telegra.ph/file/32ffb10285e5482b19d89.jpg';
    let pp = defaultAvatar;
    
    if (ppCache.has(who)) {
        pp = ppCache.get(who);
    } else {
        try {
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('timeout')), 3000)
            );
            const ppPromise = conn.profilePictureUrl(who, 'image');
            pp = await Promise.race([ppPromise, timeoutPromise]);
            ppCache.set(who, pp);
        } catch (e) {
            pp = defaultAvatar;
            ppCache.set(who, defaultAvatar);
        }
    }

    try {
        // ========== AMBIL DATA USER DARI global.rpg ==========
        let user = global.rpg?.data?.user?.[who];
        
        // Kalau user belum ada, buat baru di SQLite
        if (!user) {
            // Coba cek apakah ada di SQLite langsung
            const sqlite = global.sqlite;
            if (sqlite) {
                const result = sqlite
                    .query("SELECT * FROM user WHERE jid = ?")
                    .get(who);
                
                if (result) {
                    // Convert ke object yang bisa dipake
                    user = result;
                    // Simpan ke cache global.rpg
                    if (!global.rpg.data.user) global.rpg.data.user = {};
                    global.rpg.data.user[who] = user;
                }
            }
        }
        
        // Kalau masih ga ada, buat baru
        if (!user) {
            if (!global.rpg.data.user) global.rpg.data.user = {};
            global.rpg.data.user[who] = {
                premium: 0,
                premiumTime: 0,
                premiumType: 'free',
                level: 1,
                exp: 0,
                limit: 100,
                money: 0,
                bank: 0,
                chat_count: 0,
                role: 'Beginner',
                registered: 0,
                regTime: 0,
                name: '',
                pasangan: '',
                age: -1
            };
            user = global.rpg.data.user[who];
        }

        let numberClean = who.split('@')[0];
        
        let about = '-';
        try {
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('timeout')), 2000)
            );
            const statusPromise = conn.fetchStatus(who);
            const status = await Promise.race([statusPromise, timeoutPromise]);
            about = status?.status || '-';
        } catch (e) {
            about = '-';
        }

        let groupMetadata = m.isGroup ? await conn.groupMetadata(m.chat).catch(() => ({})) : {};
        let participants = m.isGroup ? groupMetadata.participants || [] : [];

        let realNumber = numberClean;
        
        if (numberClean.length > 12) {
            if (participants.length > 0) {
                let found = participants.find(p => p.id === who || p.jid === who);
                if (found && found.phoneNumber) {
                    realNumber = found.phoneNumber;
                }
            }
            if (realNumber === numberClean && global.db?.data?.lidMapping?.[who]) {
                realNumber = global.db.data.lidMapping[who].split('@')[0];
            }
        }

        let formattedNumber = realNumber;
        formattedNumber = formattedNumber.replace(/@s\.whatsapp\.net/g, '');
        
        if (formattedNumber.startsWith('62')) {
            let num = formattedNumber.slice(2);
            if (num.length >= 12) {
                formattedNumber = '+62 ' + num.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
            } else {
                formattedNumber = '+62 ' + num;
            }
        } else if (formattedNumber.startsWith('08')) {
            let num = formattedNumber.slice(1);
            if (num.length >= 11) {
                formattedNumber = '0' + num.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
            } else {
                formattedNumber = '0' + num;
            }
        }

        let waLink = realNumber.replace(/@s\.whatsapp\.net/g, '');

        let {
            name = '',
            pasangan = '',
            limit = 100,
            exp = 0,
            money = 0,
            bank = 0,
            premium = 0,
            premiumTime = 0,
            premiumType: userPremiumType = 'free',
            registered = 0,
            regTime = 0,
            age = -1,
            level = 1,
            role = 'Beginner',
            chat_count = 0
        } = user;

        let now = Date.now();
        
        let username;
        try {
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('timeout')), 2000)
            );
            const namePromise = conn.getName(who);
            username = await Promise.race([namePromise, timeoutPromise]);
            if (!username || username.includes('@') || username === '') {
                username = user.name || realNumber || numberClean;
            }
        } catch (e) {
            username = user.name || realNumber || numberClean;
        }

        let isUserPremium = premium === 1 && (premiumTime === 0 || premiumTime > now);
        let premiumBadge = isUserPremium ? '✅' : '❌';
        let premiumLabel = isUserPremium ? 'Premium' : 'Free';
        let expired = premiumTime === 0 ? 'Lifetime' : new Date(premiumTime).toLocaleDateString();

        let regDate = '❌';
        if (registered && regTime > 0) {
            let date = new Date(regTime);
            if (date.getFullYear() > 1970) {
                regDate = '✅ (' + date.toLocaleDateString() + ')';
            } else {
                regDate = '✅';
            }
        }

        let str = `
┏━━━ *PROFILE* ━━━
┃
┃ 👤 *Name:* ${username}${registered ? ' (' + name + ')' : ''}
┃ 📱 *Number:* ${formattedNumber}
┃ 🔗 *Link:* https://wa.me/${waLink}
┃ 📝 *About:* ${about || '-'}
┃
┃ ✨ *Premium Status:* ${premiumBadge} ${premiumLabel}
┃ 👑 *Premium Type:* ${userPremiumType || 'free'}
┃ ⏰ *Expired:* ${expired}
┃
┃ 📊 *Level:* ${level} (${role})
┃ ⭐ *XP:* ${exp} XP
┃ 💰 *Money:* Rp${money}
┃ 💳 *Bank:* Rp${bank}
┃ 💎 *Limit:* ${limit}
┃ 💬 *Total Chat:* ${chat_count}
┃
┃ 💑 *Status:* ${pasangan ? 'Berpacaran ❤️' : 'Jomblo 🥲'}
┃ 📅 *Registered:* ${regDate}
┃ ${age > 0 ? '🎂 *Age:* ' + age + ' tahun' : ''}
┃
┗━━━━━━━━━━━━━━━━━━━

📌 *${usedPrefix}profile @user* - Cek profile orang lain
`.trim();

        let mentionedJid = [who];
        
        await conn.sendMessage(m.chat, {
            image: { url: pp },
            caption: str,
            contextInfo: {
                mentionedJid: mentionedJid
            }
        }, { quoted: m });
        
    } catch (e) {
        await m.reply(`❌ Error: ${e.message || e}`);
    }
};

handler.help = ['profile'];
handler.tags = ['info'];
handler.command = /^profile$/i;
handler.limit = false;
handler.register = true;
handler.premium = false;

export default handler;