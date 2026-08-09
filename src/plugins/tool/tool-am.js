// src/plugins/tool/tool-amprem.js
// Auto-generate akun Alight Motion Premium
// BASE URL : https://alightmotion.qsr.web.id
// AUTHOR : VELLZY

const BASE = "https://api.internal.temp-mail.io/api/v3";
const HEADERS = {
    "User-Agent": "okhttp/4.12.0",
    "Content-Type": "application/json",
    "Accept-Encoding": "gzip",
};

const SITE = "https://alightmotion.qsr.web.id";

function randomNum(len = 5) {
    let s = "";
    for (let i = 0; i < len; i++) s += Math.floor(Math.random() * 10);
    return s;
}

async function createEmail(name) {
    const res = await fetch(`${BASE}/email/new`, {
        method: "POST",
        headers: HEADERS,
        body: JSON.stringify({ name }),
    });
    return res.json();
}

async function getMessages(email) {
    const res = await fetch(`${BASE}/email/${email}/messages`, { headers: HEADERS });
    return res.json();
}

function extractLink(html) {
    const m = (html || "").match(/https:\/\/alight-creative\.firebaseapp\.com\/__\/auth\/links\?link=[^'"]+/);
    return m ? m[0].replace(/&amp;/g, "&") : null;
}

async function waitForLink(email, timeoutMs = 60000) {
    const end = Date.now() + timeoutMs;
    while (Date.now() < end) {
        try {
            const msgs = await getMessages(email);
            if (msgs.length) {
                const link = extractLink(msgs[0].body_html);
                if (link) return link;
            }
        } catch (e) {
            // silent
        }
        await new Promise((r) => setTimeout(r, 3000));
    }
    return null;
}

async function processOne() {
    const name = "vellzyy" + randomNum();
    const data = await createEmail(name);
    const email = data.email;
    const token = data.token;

    // Kirim permintaan email verifikasi
    const r = await fetch(`${SITE}/api/email-prem?email=${encodeURIComponent(email)}`);
    const rd = await r.json();

    // Tunggu link verifikasi masuk
    const link = await waitForLink(email);

    let verify = null;
    if (link) {
        const v = await fetch(`${SITE}/api/vertif-prem?email=${encodeURIComponent(email)}&link=${encodeURIComponent(link)}`);
        verify = await v.json();
    }

    const inboxUrl = `https://temp-mail.io/id/email/${email}/token/${token}`;

    return {
        email,
        token,
        inboxUrl,
        emailPrem: rd,
        link,
        verify,
    };
}

let handler = async (m, { conn, args, usedPrefix, command, isOwner }) => {
    // Validasi: cuma owner yang bisa (karena ini generate massal)
    if (!isOwner) {
        return m.reply('❌ Perintah ini khusus untuk owner bot!');
    }

    // Parse jumlah akun yang mau dibuat
    let amount = parseInt(args[0]) || 1;
    if (amount < 1) amount = 1;
    if (amount > 10) amount = 10; // Batasi maksimal 10 biar gak overload

    // Kirim pesan proses
    await m.reply(`⏳ *Memproses ${amount} akun Alight Motion Premium...*\n\n_Proses ini memakan waktu sekitar 1-2 menit per akun_`);

    let results = [];
    let successCount = 0;
    let failCount = 0;

    for (let i = 1; i <= amount; i++) {
        try {
            // Update status
            await m.reply(`🔄 *Akun ${i}/${amount}* - Sedang diproses...`);

            const res = await processOne();

            // Format hasil
            let status = res.link ? '✅ BERHASIL' : '❌ GAGAL';
            let resultText = `\n┌─ 📧 *AKUN ${i}/${amount}*\n`;
            resultText += `│ 📧 Email: ${res.email}\n`;
            resultText += `│ 🔑 Token: ${res.token}\n`;
            resultText += `│ 📬 Inbox: ${res.inboxUrl}\n`;
            resultText += `│ 🔗 Link: ${res.link || '(Tidak ditemukan)'}\n`;
            resultText += `│ 📊 Status: ${status}\n`;
            if (res.verify) {
                resultText += `│ ✅ Verifikasi: ${JSON.stringify(res.verify.message || res.verify)}\n`;
            }
            resultText += `└─────────────────────────`;

            results.push(resultText);

            if (res.link) successCount++;
            else failCount++;

            // Tunggu 30 detik sebelum akun berikutnya (hindari rate-limit)
            if (i < amount) {
                await m.reply(`⏳ *Menunggu 30 detik* sebelum akun berikutnya... (${i}/${amount})`);
                await new Promise((r) => setTimeout(r, 30000));
            }

        } catch (e) {
            failCount++;
            results.push(`\n┌─ ❌ *AKUN ${i}/${amount} GAGAL*\n│ Error: ${e.message}\n└─────────────────────────`);
        }
    }

    // Kirim hasil akhir
    let finalText = `📊 *HASIL GENERATE ALIGHT MOTION PREMIUM*\n`;
    finalText += `━━━━━━━━━━━━━━━━━━━━━━\n`;
    finalText += `📌 Total: ${amount} akun\n`;
    finalText += `✅ Berhasil: ${successCount} akun\n`;
    finalText += `❌ Gagal: ${failCount} akun\n`;
    finalText += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    finalText += results.join('\n');

    // Kirim hasil (split kalo kepanjangan)
    if (finalText.length > 4000) {
        // Kirim per bagian
        for (let i = 0; i < results.length; i++) {
            let part = `📊 *HASIL GENERATE (${i+1}/${results.length})*\n━━━━━━━━━━━━━━━━━━━━━━\n${results[i]}`;
            await conn.sendMessage(m.chat, { text: part });
        }
        // Kirim summary
        let summary = `📊 *SUMMARY*\n━━━━━━━━━━━━━━━━━━━━━━\n✅ Berhasil: ${successCount}\n❌ Gagal: ${failCount}`;
        await conn.sendMessage(m.chat, { text: summary });
    } else {
        await conn.sendMessage(m.chat, { text: finalText });
    }
};

// Konfigurasi command
handler.help = ['amprem', 'alightprem'];
handler.tags = ['tools'];
handler.command = /^(amprem|alightprem|alightpremium)$/i;
handler.owner = true; // Hanya owner yang bisa
handler.desc = [
    'Auto-generate akun Alight Motion Premium',
    'Gunakan: !amprem <jumlah> (max 10)',
    'Contoh: !amprem 5'
];

export default handler;