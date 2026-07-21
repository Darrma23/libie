/**
 * Plugin Stickerly - Cari dan download stiker dari Sticker.ly
 * Mode: Keyword atau URL
 * Framework: Libie WhatsApp Bot (Baileys)
 * 
 * @author Reneasy
 * @version 3.1.0
 */

import { sticker } from "#lib/sticker.js";
import * as cheerio from "cheerio";

// ============================================================
// UTILITY HELPERS
// ============================================================

/**
 * Fetch dengan retry dan timeout
 * @param {string} url
 * @param {object} options - fetch options
 * @param {number} retries - jumlah percobaan (default: 3)
 * @returns {Promise<Response>}
 */
async function fetchWithRetry(url, options = {}, retries = 3) {
  let lastError;
  
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, {
        ...options,
        signal: AbortSignal.timeout(10000),
      });
      
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} - ${res.statusText}`);
      }
      
      return res;
    } catch (err) {
      lastError = err;
      
      if (i < retries - 1) {
        const delay = Math.pow(2, i) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
  
  throw new Error(`Fetch gagal setelah ${retries} percobaan: ${lastError.message}`);
}

/**
 * Kompres stiker jika ukuran > 1MB
 * @param {Buffer} buffer
 * @param {object} options
 * @param {number} options.quality - kualitas awal (0-100)
 * @param {number} options.fps - frame per second
 * @param {number} options.maxDuration - durasi maksimal (detik)
 * @param {string} packName
 * @param {string} authorName
 * @param {Array} emojis
 * @returns {Promise<Buffer>}
 */
async function compressSticker(
  buffer,
  { quality = 90, fps = 30, maxDuration = 10, packName, authorName, emojis = [] }
) {
  const MAX_SIZE = 1 * 1024 * 1024; // 1 MB
  const MAX_ATTEMPTS = 4;
  
  let currentQuality = quality;
  let currentFps = fps;
  let attempts = 0;
  
  let stickerBuffer = await sticker(buffer, {
    quality: currentQuality,
    fps: currentFps,
    maxDuration,
    packName,
    authorName,
    emojis,
  });
  
  while (stickerBuffer.length > MAX_SIZE && attempts < MAX_ATTEMPTS) {
    attempts++;
    currentQuality = Math.max(30, currentQuality - 15);
    currentFps = Math.max(10, currentFps - 5);
    
    stickerBuffer = await sticker(buffer, {
      quality: currentQuality,
      fps: currentFps,
      maxDuration,
      packName,
      authorName,
      emojis,
    });
  }
  
  return stickerBuffer;
}

/**
 * Download dan konversi stiker dari URL
 * @param {string} url
 * @param {string} packName
 * @param {string} authorName
 * @returns {Promise<Buffer>}
 */
async function downloadSticker(url, packName, authorName) {
  const res = await fetchWithRetry(url);
  const buffer = Buffer.from(await res.arrayBuffer());
  
  return await compressSticker(buffer, {
    quality: 90,
    fps: 30,
    maxDuration: 10,
    packName,
    authorName,
    emojis: [],
  });
}

// ============================================================
// SEARCH MODE (API)
// ============================================================

/**
 * Cari pack stiker berdasarkan keyword via API
 * @param {string} keyword
 * @returns {Promise<{ packName: string, creator: string, stickerUrls: string[] }>}
 */
async function searchPack(keyword) {
  const timestamp = Date.now();
  
  const res = await fetchWithRetry("https://api.sticker.ly/v4/stickerPack/smartSearch", {
    method: "POST",
    headers: {
      "User-Agent": "androidapp.stickerly/3.25.2 (220333QAG; U; Android 30; ms-MY; id;)",
      "Content-Type": "application/json",
      "Accept-Encoding": "gzip",
      "x-duid": Buffer.from(timestamp.toString()).toString("base64"),
    },
    body: JSON.stringify({
      keyword: keyword,
      enabledKeywordSearch: true,
      filter: {
        extendSearchResult: true,
        sortBy: "RECOMMENDED",
        languages: ["ALL"],
        minStickerCount: 10,
        searchBy: "ALL",
        stickerType: "ALL",
      },
    }),
  });
  
  const json = await res.json();
  const packs = json?.result?.stickerPacks || [];
  
  if (!packs.length) {
    throw new Error(`Tidak ditemukan pack untuk keyword: "${keyword}"`);
  }
  
  const validPacks = packs.filter((pack) => pack.resourceFiles?.length >= 5);
  
  if (!validPacks.length) {
    throw new Error("Tidak ada pack dengan minimal 5 stiker.");
  }
  
  const randomPack = validPacks[Math.floor(Math.random() * validPacks.length)];
  
  const prefix = randomPack.resourceUrlPrefix || "";
  const stickerUrls = randomPack.resourceFiles.map((file) =>
    file.startsWith("http") ? file : prefix + file
  );
  
  const packName = randomPack.packName || randomPack.name || "Sticker Pack";
  const creator = randomPack.creatorName || 
                  randomPack.author || 
                  randomPack.user?.name || 
                  "Unknown";
  
  return {
    packName,
    creator,
    stickerUrls,
  };
}

// ============================================================
// URL MODE (SCRAPING - PRIORITAS JSON)
// ============================================================

/**
 * Ekstrak URL dari berbagai atribut
 * @param {cheerio.Element} el - Elemen cheerio
 * @param {cheerio.CheerioAPI} $ - Cheerio instance
 * @returns {string|null}
 */
function extractImageUrl(el, $) {
  const attributes = ['src', 'data-src', 'data-original', 'data-lazy-src', 'data-url'];
  
  for (const attr of attributes) {
    const value = $(el).attr(attr);
    if (value && value.startsWith('http')) {
      return value;
    }
  }
  
  const onerror = $(el).attr('onerror') || '';
  const match = onerror.match(/src=['"]([^'"]+)['"]/);
  if (match && match[1].startsWith('http')) {
    return match[1];
  }
  
  const style = $(el).attr('style') || '';
  const bgMatch = style.match(/url\(['"]?([^'")]+)['"]?\)/);
  if (bgMatch && bgMatch[1].startsWith('http')) {
    return bgMatch[1];
  }
  
  return null;
}

/**
 * Ekstrak data dari embedded JSON di halaman
 * @param {string} html
 * @returns {object|null}
 */
function extractJsonData(html) {
  const jsonPatterns = [
    /<script[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/,
    /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/,
    /<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/,
    /<script[^>]*id="__NEXT_LOADED_PAGES__"[^>]*>([\s\S]*?)<\/script>/,
    /<script[^>]*>window\.__INITIAL_STATE__\s*=\s*({[\s\S]*?});?<\/script>/,
    /<script[^>]*>window\.__INITIAL_PROPS__\s*=\s*({[\s\S]*?});?<\/script>/,
  ];
  
  for (const pattern of jsonPatterns) {
    const match = html.match(pattern);
    if (match) {
      try {
        const data = JSON.parse(match[1]);
        return data;
      } catch {
        continue;
      }
    }
  }
  
  return null;
}

/**
 * Cari pack data di dalam object JSON
 * @param {object} json
 * @returns {object|null}
 */
function findPackData(json) {
  if (!json || typeof json !== 'object') return null;
  
  // Cari langsung
  if (json.packName && json.resourceFiles) {
    return json;
  }
  
  // Cari di props
  if (json.props?.pageProps?.pack) {
    return json.props.pageProps.pack;
  }
  
  if (json.pageProps?.pack) {
    return json.pageProps.pack;
  }
  
  // Cari di result
  if (json.result) {
    return json.result;
  }
  
  // Cari nested
  const keys = ['pack', 'stickerPack', 'data', 'content'];
  for (const key of keys) {
    if (json[key] && json[key].resourceFiles) {
      return json[key];
    }
  }
  
  // Rekursif cari
  for (const key in json) {
    if (typeof json[key] === 'object') {
      const found = findPackData(json[key]);
      if (found) return found;
    }
  }
  
  return null;
}

/**
 * Scrape pack dari URL Sticker.ly (Prioritas JSON)
 * @param {string} url - https://sticker.ly/s/XXXXXXXX
 * @returns {Promise<{ packName: string, creator: string, stickerUrls: string[] }>}
 */
async function scrapePack(url) {
  const packId = url.match(/sticker\.ly\/s\/([a-zA-Z0-9_-]+)/)?.[1];
  if (!packId) {
    throw new Error("URL tidak valid. Format: https://sticker.ly/s/XXXXXXXX");
  }
  
  const htmlRes = await fetchWithRetry(url);
  const html = await htmlRes.text();
  
  // ===== PRIORITAS 1: AMBIL DARI JSON =====
  const jsonData = extractJsonData(html);
  let packData = null;
  
  if (jsonData) {
    packData = findPackData(jsonData);
  }
  
  if (packData && packData.resourceFiles?.length) {
    const prefix = packData.resourceUrlPrefix || "";
    const stickerUrls = packData.resourceFiles.map((file) =>
      file.startsWith("http") ? file : prefix + file
    );
    
    const packName = packData.packName || packData.name || "Sticker Pack";
    const creator = packData.creatorName || 
                    packData.author || 
                    packData.user?.name || 
                    "Unknown";
    
    return { packName, creator, stickerUrls };
  }
  
  // ===== PRIORITAS 2: FALLBACK KE CHEERIO =====
  const $ = cheerio.load(html);
  
  let packName = "Sticker Pack";
  const metaTitle = $('meta[property="og:title"]').attr('content') || 
                    $('meta[name="title"]').attr('content') ||
                    $('meta[name="twitter:title"]').attr('content');
  
  if (metaTitle) {
    packName = metaTitle;
  } else {
    const heading = $('h1[class*="title"]').first().text().trim() || 
                    $('h1[class*="pack"]').first().text().trim() ||
                    $('[class*="pack-title"]').first().text().trim();
    if (heading) packName = heading;
  }
  
  let creator = "Unknown";
  const creatorSelectors = [
    '.creator-name',
    '[class*="creator"]',
    '[class*="author"]',
    '[class*="user-name"]',
    '.name',
    '.username'
  ];
  
  for (const selector of creatorSelectors) {
    const element = $(selector).first();
    if (element.length) {
      const text = element.text().trim();
      if (text) {
        creator = text;
        break;
      }
    }
  }
  
  // ===== PRIORITAS 3: AMBIL STICKER URLS =====
  const stickerUrls = [];
  const seen = new Set();
  
  const imageSelectors = [
    '.sticker_img',
    '[class*="sticker"] img',
    '[class*="pack"] img',
    '#content_images img',
    '.sticker-item img',
    'img[class*="sticker"]'
  ];
  
  let found = false;
  
  for (const selector of imageSelectors) {
    const elements = $(selector);
    if (elements.length) {
      elements.each((i, el) => {
        const url = extractImageUrl(el, $);
        if (url && !seen.has(url)) {
          seen.add(url);
          stickerUrls.push(url);
          found = true;
        }
      });
      
      if (found) break;
    }
  }
  
  if (!stickerUrls.length) {
    $('.sticker-container img, .pack-content img, .sticker-grid img').each((i, el) => {
      const url = extractImageUrl(el, $);
      if (url && !seen.has(url)) {
        seen.add(url);
        stickerUrls.push(url);
      }
    });
  }
  
  if (!stickerUrls.length) {
    throw new Error("Tidak ditemukan stiker di URL tersebut.");
  }
  
  return {
    packName: packName || "Sticker Pack",
    creator: creator || "Unknown",
    stickerUrls,
  };
}

// ============================================================
// PENGIRIMAN STIKER
// ============================================================

/**
 * Kirim semua stiker dengan progress dan laporan
 * @param {object} conn - Baileys connection
 * @param {object} m - Message object
 * @param {string[]} stickerUrls
 * @param {string} packName
 * @param {string} creator
 */
async function sendStickerPack(conn, m, stickerUrls, packName, creator) {
  // Ambil konfigurasi dari global.config
  const configPack = global.config?.stickpack || "Libie";
  const configAuth = global.config?.stickauth || "© Himejima";
  
  await conn.sendMessage(
    m.chat,
    {
      text: `📦 *${packName || "Sticker Pack"}*\n👤 ${creator || "Unknown"}\n🖼 ${stickerUrls.length} stiker\n\n_Mengirim..._`,
    },
    { quoted: m }
  );
  
  let success = 0;
  const total = stickerUrls.length;
  
  for (let i = 0; i < total; i++) {
    try {
      const stickerBuffer = await downloadSticker(
        stickerUrls[i],
        configPack,
        configAuth
      );
      
      await conn.sendMessage(
        m.chat,
        { sticker: stickerBuffer },
        { quoted: m }
      );
      
      success++;
    } catch (err) {
      global.logger?.error(err);
    }
    
    const delay = 150 + Math.floor(Math.random() * 50);
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
  
  const status = success === total ? "✅" : "⚠️";
  await conn.sendMessage(
    m.chat,
    {
      text: `${status} Selesai! ${success}/${total} stiker berhasil dikirim.`,
    },
    { quoted: m }
  );
}

// ============================================================
// HELPER: EKSTRAK URL DARI TEKS
// ============================================================

/**
 * Ekstrak URL Sticker.ly dari teks
 * @param {string} text
 * @returns {string|null}
 */
function extractStickerlyUrl(text) {
  const regex = /https?:\/\/(?:www\.)?sticker\.ly\/s\/[a-zA-Z0-9_-]+/;
  const match = text.match(regex);
  return match ? match[0] : null;
}

// ============================================================
// HANDLER UTAMA
// ============================================================

let handler = async (m, { conn, text, usedPrefix, command }) => {
  try {
    if (!text) {
      return m.reply(
        `📌 *Cara pakai:*\n` +
          `${usedPrefix + command} <keyword>\n` +
          `${usedPrefix + command} <url sticker.ly>\n\n` +
          `📝 *Contoh:*\n` +
          `${usedPrefix + command} anime\n` +
          `${usedPrefix + command} https://sticker.ly/s/abc123`
      );
    }
    
    await global.loading?.(m, conn);
    
    const input = text.trim();
    let packData;
    
    const extractedUrl = extractStickerlyUrl(input);
    
    if (extractedUrl) {
      packData = await scrapePack(extractedUrl);
    } else {
      packData = await searchPack(input);
    }
    
    if (!packData.stickerUrls.length) {
      throw new Error("Tidak ada stiker yang ditemukan.");
    }
    
    await sendStickerPack(conn, m, packData.stickerUrls, packData.packName, packData.creator);
  } catch (err) {
    global.logger?.error(err);
    await m.reply(`❌ Error: ${err.message || "Terjadi kesalahan"}`);
  } finally {
    await global.loading?.(m, conn, true);
  }
};

// ============================================================
// METADATA PLUGIN
// ============================================================

handler.help = ["stickerly"];
handler.tags = ["maker"];
handler.command = /^(stickerly|stikerly|stickersearch)$/i;

export default handler;