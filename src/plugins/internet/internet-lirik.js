// src/plugins/lyrics.js
import axios from 'axios'

const handler = async (m, { conn, text }) => {
  try {
    if (!text) {
      return m.reply(
        "🎵 *Cara penggunaan:*\n.lyrics <judul lagu>\n\n*Contoh:*\n.lyrics faded\n.lyrics alone alan walker"
      );
    }

    await conn.sendPresenceUpdate("composing", m.chat);
    await global.loading(m, conn);

    const query = encodeURIComponent(text);
    const url = `https://www.keyrafara.com/search/lyrics?q=${query}`;
    
    console.log(`📤 Request to: ${url}`);
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36'
      },
      timeout: 15000
    });

    const data = response.data;

    if (!data.status || !data.result) {
      return m.reply("❌ Lagu tidak ditemukan.");
    }

    const result = data.result;
    
    let lyrics = result.lyrics?.plain_lyrics || result.lyrics?.synced_lyrics || '';
    
    if (!lyrics) {
      return m.reply("❌ Gagal mengambil lirik untuk lagu ini.");
    }

    // Bersihkan timestamp
    lyrics = lyrics
      .replace(/\[.*?\]/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    // Header
    const message = [
      `🎵 *${result.title}*`,
      `👤 *Artist:* ${result.artist}`,
      `💿 *Album:* ${result.lyrics?.album_name || 'N/A'}`,
      `⏱️ *Duration:* ${formatDuration(result.lyrics?.duration || 0)}`,
      ``,
      `📝 *Lirik:*`,
      ``,
      lyrics,
    ].join('\n');

    // ===== DOWNLOAD THUMBNAIL =====
    let thumbnailBuffer = null;
    if (result.thumbnail) {
      try {
        const imageRes = await fetch(result.thumbnail, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36'
          }
        });
        if (imageRes.ok) {
          const arrayBuffer = await imageRes.arrayBuffer();
          thumbnailBuffer = Buffer.from(arrayBuffer);
          console.log(`✅ Thumbnail downloaded: ${thumbnailBuffer.length} bytes`);
        }
      } catch (e) {
        console.error('❌ Gagal download thumbnail:', e.message);
      }
    }

    // ===== KIRIM PESAN DENGAN THUMBNAIL =====
    const messageOptions = {
      text: message,
      contextInfo: {
        externalAdReply: {
          title: result.title,
          body: result.artist,
          mediaType: 1,
          thumbnail: thumbnailBuffer, // Kirim buffer, bukan URL
          sourceUrl: result.spotify_url || 'https://spotify.com'
        }
      }
    };

    await conn.sendMessage(m.chat, messageOptions, { quoted: m });
    
  } catch (e) {
    console.error("Lyrics error:", e.message);
    m.reply(`❌ Gagal mengambil lirik: ${e.message}`);
  } finally {
    await global.loading(m, conn, true);
  }
};

function formatDuration(seconds) {
  if (!seconds || seconds < 0) return 'N/A';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

handler.help = ["lyrics"];
handler.tags = ["internet"];
handler.command = /^(lyrics|lirik)$/i;

export default handler;