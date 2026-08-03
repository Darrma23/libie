// plugins/alight-premium.js
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
import path from 'path';

// ─── PAKAI STEALTH DENGAN CONFIG LEBIH KUAT ───
puppeteer.use(StealthPlugin({
  languages: ['id-ID', 'id'],
  vendor: 'Google Inc.',
  platform: 'Win32',
  webglVendor: 'Intel Inc.',
  renderer: 'Intel Iris OpenGL Engine'
}));

const BASE_URL = 'https://amprem.irfanjawa.com';
const sessions = {};
const COOKIE_DIR = './cookies';

if (!fs.existsSync(COOKIE_DIR)) {
  fs.mkdirSync(COOKIE_DIR, { recursive: true });
}

// ─── FUNGSI BYPASS CLOUDFLARE ───
async function getCookies() {
  const cookieFile = path.join(COOKIE_DIR, 'cf_cookies.json');
  
  // Cek cookie expired
  if (fs.existsSync(cookieFile)) {
    const stats = fs.statSync(cookieFile);
    const age = (Date.now() - stats.mtimeMs) / 1000 / 60;
    if (age < 60) {
      const cookies = JSON.parse(fs.readFileSync(cookieFile, 'utf8'));
      return cookies.map(c => `${c.name}=${c.value}`).join('; ');
    }
  }

  console.log('🔄 Mengambil cookie baru...');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-features=IsolateOrigins,site-per-process',
      '--disable-web-security',
      '--disable-features=BlockInsecurePrivateNetworkRequests',
      '--disable-features=OutOfBlinkCors',
      '--window-size=1920,1080',
      '--start-maximized'
    ]
  });

  try {
    const page = await browser.newPage();
    
    // ─── SET VIEWPORT ───
    await page.setViewport({ width: 1920, height: 1080 });
    
    // ─── SET USER AGENT ───
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // ─── SET EXTRA HEADERS ───
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
      'Accept-Encoding': 'gzip, deflate, br',
      'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
      'Sec-Ch-Ua-Mobile': '?0',
      'Sec-Ch-Ua-Platform': '"Windows"',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1'
    });

    // ─── NAVIGASI ───
    await page.goto(`${BASE_URL}/auth?tab=register`, {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    console.log('⏳ Menunggu Cloudflare selesai...');
    
    // ─── TUNGGU SAMPAI CLOUDFLARE SELESAI ───
    try {
      await page.waitForFunction(
        () => {
          // Cek apakah Cloudflare challenge sudah hilang
          const cfElement = document.querySelector('#challenge-running, .cf-browser-verification, #cf-content, #cf-challenge');
          return !cfElement || cfElement.style.display === 'none';
        },
        { timeout: 30000 }
      );
    } catch (e) {
      console.log('⚠️ Mungkin ga ada Cloudflare challenge, lanjut...');
    }

    // ─── TUNGGU SEBENTAR ───
    await new Promise(resolve => setTimeout(resolve, 5000));

    // ─── AMBIL COOKIES ───
    const cookies = await page.cookies();
    console.log(`✅ Mendapatkan ${cookies.length} cookies`);
    
    // ─── SAVE COOKIES ───
    fs.writeFileSync(cookieFile, JSON.stringify(cookies, null, 2));
    
    // ─── SCREENSHOT BUAT DEBUG ───
    await page.screenshot({ path: path.join(COOKIE_DIR, 'last_screenshot.png') });
    console.log('📸 Screenshot saved to cookies/last_screenshot.png');
    
    await browser.close();
    
    return cookies.map(c => `${c.name}=${c.value}`).join('; ');

  } catch (err) {
    await browser.close();
    throw err;
  }
}

// ─── FUNGSI REQUEST PAKE FETCH ───
async function makeRequest(endpoint, data, cookie) {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json, text/plain, */*',
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Cookie': cookie,
      'Origin': BASE_URL,
      'Referer': `${BASE_URL}/auth?tab=register`,
      'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7'
    },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }

  return response.json();
}

// ─── HANDLER ───
let handler = async (m, { conn, usedPrefix, command, text }) => {
  const userId = m.sender;

  if (command === 'amlink') {
    if (!text) {
      return m.reply(
        `📧 *Cara pakai:*\n` +
        `${usedPrefix}amlink email@domain.com\n\n` +
        `Contoh: ${usedPrefix}amlink noisyboyss887@gmail.com`
      );
    }

    const email = text.trim();
    await m.reply(`⏳ Mengirim link ke *${email}*...\n\n🛡️ Bypassing Cloudflare...`);

    try {
      const cookie = await getCookies();
      const data = await makeRequest('/api/send', { email }, cookie);

      sessions[userId] = {
        email: email,
        orderCode: data.orderCode || data.code || 'N/A',
        step: 'waiting_link',
        timestamp: Date.now()
      };

      await m.reply(
        `✅ *Link berhasil dikirim!*\n\n` +
        `📧 Email: ${email}\n` +
        `🔑 Order Code: ${sessions[userId].orderCode}\n\n` +
        `📌 *Langkah selanjutnya:*\n` +
        `1. Cek inbox/spam email\n` +
        `2. Copy URL dari tombol "Login ke Alight Creative"\n` +
        `3. Kirim: ${usedPrefix}amverify <link>\n\n` +
        `⚠️ *Jangan klik link, cukup copy!*`
      );

    } catch (err) {
      console.error('Error:', err);
      await m.reply(`❌ Gagal: ${err.message || 'Unknown error'}`);
    }
  }

  else if (command === 'amverify') {
    const session = sessions[userId];
    
    if (!session || session.step !== 'waiting_link') {
      return m.reply(`⚠️ Kirim email dulu pake ${usedPrefix}amlink!`);
    }

    if (Date.now() - session.timestamp > 300000) {
      delete sessions[userId];
      return m.reply('⏰ Sesi expired (5 menit). Kirim ulang .amlink');
    }

    if (!text) {
      return m.reply(
        `📎 *Cara pakai:*\n` +
        `${usedPrefix}amverify <link_yang_dicopy>\n\n` +
        `Contoh: ${usedPrefix}amverify https://alightcreative.com/verify?oobCode=xxx`
      );
    }

    const rawLink = text.trim();
    await m.reply('⏳ Memverifikasi link...');

    try {
      const cookie = await getCookies();
      const data = await makeRequest('/api/verify', {
        email: session.email,
        rawLink: rawLink
      }, cookie);

      delete sessions[userId];

      await m.reply(
        `🎉 *PREMIUM AKTIF!*\n\n` +
        `📧 Email: ${session.email}\n` +
        `⏱️ Durasi: 1 Tahun\n` +
        `✅ Status: Verified\n\n` +
        `⚠️ *Jangan bagikan token ini!*\n` +
        `🆔 Token: ${data.idToken ? data.idToken.substring(0, 20) + '...' : 'N/A'}`
      );

    } catch (err) {
      console.error('Verify Error:', err);
      await m.reply(`❌ Verifikasi gagal: ${err.message || 'Unknown error'}`);
    }
  }

  else if (command === 'amstatus') {
    const session = sessions[userId];
    
    if (!session) {
      return m.reply('📭 Tidak ada sesi aktif.\n\nMulai dengan `.amlink email@domain.com`');
    }

    const waktu = Math.floor((Date.now() - session.timestamp) / 1000);
    const menit = Math.floor(waktu / 60);
    const detik = waktu % 60;

    await m.reply(
      `📊 *Status Sesi*\n\n` +
      `📧 Email: ${session.email}\n` +
      `🔑 Order Code: ${session.orderCode || 'N/A'}\n` +
      `⏱️ Waktu: ${menit}m ${detik}s\n` +
      `📌 Step: ${session.step === 'waiting_link' ? '⏳ Menunggu Verifikasi' : '✅ Selesai'}\n\n` +
      `${session.step === 'waiting_link' ? `💡 Kirim ${usedPrefix}amverify <link>` : ''}`
    );
  }
  
  else if (command === 'amreset') {
    const cookieFile = path.join(COOKIE_DIR, 'cf_cookies.json');
    if (fs.existsSync(cookieFile)) {
      fs.unlinkSync(cookieFile);
      await m.reply('✅ Cookie berhasil direset! Coba .amlink lagi.');
    } else {
      await m.reply('📭 Tidak ada cookie yang disimpan.');
    }
  }
};

handler.help = ['amlink', 'amverify', 'amstatus', 'amreset'];
handler.tags = ['tools'];
handler.command = /^(amlink|amverify|amstatus|amreset)$/i;
handler.group = true;

export default handler;