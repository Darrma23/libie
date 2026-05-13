/**
 * MediaFire Downloader Plugin
 * Jangan hapus credit, nanti karma hidup lo ikut kehapus.
 */

const MEDIAFIRE_URL_RE = /^https?:\/\/(?:www\.)?mediafire\.com\/(?:file|file_premium|download|\?)/i;
const DIRECT_URL_RE = /href="(https?:\/\/download\d*\.mediafire\.com\/[^"]+)"\s*[\r\n]*\s*id="downloadButton"/i;
const FILENAME_RE = /<div class="filename">([^<]+)<\/div>/i;
const FILETYPE_RE = /<div class="filetype">[\s\S]*?\(\.([A-Z0-9]+)<span/i;
const SIZE_LABEL_RE = /id="downloadButton"[^>]*>[\s\S]*?Download\s*\(([^)]+)\)/i;

const FETCH_TIMEOUT_MS = 30000;
const FETCH_RETRIES = 2;
const RETRYABLE_HTTP = new Set([408, 429, 500, 502, 503, 504, 520, 522, 524]);

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36';

const MIME_BY_EXT = {
  zip: 'application/zip',
  rar: 'application/vnd.rar',
  '7z': 'application/x-7z-compressed',
  tar: 'application/x-tar',
  gz: 'application/gzip',
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  txt: 'text/plain',
  csv: 'text/csv',
  json: 'application/json',
  xml: 'application/xml',
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  mp4: 'video/mp4',
  mkv: 'video/x-matroska',
  webm: 'video/webm',
  mov: 'video/quicktime',
  avi: 'video/x-msvideo',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  apk: 'application/vnd.android.package-archive',
  exe: 'application/vnd.microsoft.portable-executable',
};

function isMediafireUrl(value) {
  return MEDIAFIRE_URL_RE.test(String(value || '').trim());
}

function inferMimeType(extension) {
  const ext = String(extension || '').toLowerCase();
  return MIME_BY_EXT[ext] || 'application/octet-stream';
}

function parseSizeLabel(label) {
  const match = String(label || '').trim().match(/^([\d.]+)\s*(B|KB|MB|GB|TB)$/i);
  if (!match) return null;
  const value = Number(match[1]);
  const unit = match[2].toUpperCase();
  const mult = { B: 1, KB: 1024, MB: 1024 ** 2, GB: 1024 ** 3, TB: 1024 ** 4 };
  return Math.round(value * mult[unit]);
}

async function fetchHtmlWithRetry(url) {
  let lastError = null;

  for (let attempt = 0; attempt <= FETCH_RETRIES; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': USER_AGENT,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      });

      if (!res.ok) {
        if (RETRYABLE_HTTP.has(res.status) && attempt < FETCH_RETRIES) {
          await new Promise(r => setTimeout(r, 1500 * (attempt + 1)));
          continue;
        }
        throw new Error(`HTTP ${res.status}`);
      }

      return await res.text();

    } catch (err) {
      lastError = err;

      const retryable =
        err?.name === 'AbortError' ||
        ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'EAI_AGAIN'].includes(err?.code);

      if (!retryable || attempt === FETCH_RETRIES) throw err;

      await new Promise(r => setTimeout(r, 1500 * (attempt + 1)));
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastError || new Error('Gagal fetch MediaFire');
}

async function fetchMediafireFile(url) {
  if (!isMediafireUrl(url)) {
    throw new Error('Link MediaFire tidak valid');
  }

  const html = await fetchHtmlWithRetry(url);

  const directMatch = html.match(DIRECT_URL_RE);
  if (!directMatch) {
    throw new Error('Download button tidak ditemukan');
  }

  const directUrl = directMatch[1].trim();
  const filename =
    (html.match(FILENAME_RE)?.[1] || '').trim() ||
    directUrl.split('/').pop() ||
    'mediafire-file';

  const sizeLabel = (html.match(SIZE_LABEL_RE)?.[1] || '').trim();
  const filesize = parseSizeLabel(sizeLabel);

  const extension =
    (html.match(FILETYPE_RE)?.[1] || filename.split('.').pop() || '').toLowerCase();

  return {
    url: directUrl,
    filename,
    sizeLabel: sizeLabel || '-',
    filesize: filesize || 0,
    extension,
    mimeType: inferMimeType(extension),
  };
}

/* ================= HANDLER ================= */

let handler = async (m, { conn, text, usedPrefix, command }) => {
  try {
    if (!text) {
      return m.reply(
        `Masukkan link MediaFire!\n\nContoh:\n${usedPrefix + command} https://www.mediafire.com/file/...`
      );
    }

    if (!isMediafireUrl(text)) {
      return m.reply('Link tidak valid.');
    }

    await m.reply('⏳ Sedang mengambil file...');

    const data = await fetchMediafireFile(text);

    const caption = `
📦 *MEDIAFIRE DOWNLOADER*

📄 Nama: ${data.filename}
📁 Tipe: ${data.extension}
📏 Ukuran: ${data.sizeLabel}
`.trim();

    await conn.sendMessage(
      m.chat,
      {
        document: { url: data.url },
        fileName: data.filename,
        mimetype: data.mimeType,
        caption,
      },
      { quoted: m }
    );

  } catch (err) {
    console.error(err);
    m.reply(`❌ Error: ${err.message}`);
  }
};

handler.help = ['mediafire <url>'];
handler.tags = ['downloader'];
handler.command = /^(mf|mediafire)$/i;

export default handler;