const handler = async (m, { conn, text }) => {
  try {
    if (!text) {
      return m.reply(
        "🎵 *Cara penggunaan:*\n.lyrics <judul lagu>\n\n*Contoh:*\n.lyrics faded\n.lyrics alone alan walker"
      );
    }

    await conn.sendPresenceUpdate("composing", m.chat);

    // Cari lagu dari Genius
    const searchUrl = `https://genius.com/api/search/multi?q=${encodeURIComponent(text)}`;
    const searchRes = await fetch(searchUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    if (!searchRes.ok) throw new Error(`HTTP ${searchRes.status}`);

    const searchJson = await searchRes.json();
    const sections = searchJson?.response?.sections || [];
    let selectedSong = null;

    // Cari lagu pertama yang ditemukan
    for (const section of sections) {
      const hits = section.hits || [];
      for (const hit of hits) {
        const result = hit.result || {};
        const hitType = hit.type;
        const _type = result._type;

        if (hitType === "song" || _type === "song") {
          selectedSong = {
            title: result.title || "Unknown",
            artist: result.artist_names || "Unknown",
            path: result.path || "",
            image: result.header_image_url || "",
            release_date: result.release_date_for_display || "N/A",
          };
          break;
        }
      }
      if (selectedSong) break;
    }

    if (!selectedSong) {
      return m.reply("❌ Lagu tidak ditemukan.");
    }

    // Ambil lirik dari lagu yang dipilih
    const lyricsUrl = selectedSong.path.startsWith("/")
      ? `https://genius.com${selectedSong.path}`
      : selectedSong.path;

    const lyricsRes = await fetch(lyricsUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    if (!lyricsRes.ok) throw new Error(`HTTP ${lyricsRes.status}`);

    const html = await lyricsRes.text();

    // Parse lyrics dengan lebih bersih
    const lyricsMatch = html.match(/<div[^>]*data-lyrics-container="true"[^>]*>(.*?)<\/div>/gs);
    let lyrics = "";

    if (lyricsMatch) {
      for (const match of lyricsMatch) {
        let clean = match
          .replace(/<[^>]*>/g, "\n")
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&quot;/g, '"')
          .replace(/&#x27;/g, "'")
          .replace(/&#39;/g, "'")
          .replace(/\n{3,}/g, "\n\n");
        
        // Hapus baris yang tidak perlu
        const lines = clean.split("\n").filter(line => {
          const trimmed = line.trim();
          return !/^(\\d+\s*(Contributors|contributors)|Translations|Dansk|Español|Português|Français|Ελληνικά|Cymraeg|Italiano|Deutsch|Русский|Українська|Select|Language| languages?|translations?)/i.test(trimmed) &&
                 trimmed.length > 0;
        });
        
        clean = lines.join("\n");
        lyrics += clean.trim() + "\n\n";
      }
      lyrics = lyrics.trim();
    }

    if (!lyrics) {
      return m.reply("❌ Gagal mengambil lirik untuk lagu ini.");
    }

    // Truncate if too long
    if (lyrics.length > 4000) {
      lyrics = lyrics.slice(0, 4000) + "\n\n[Lirik dipotong...]";
    }

    // Buat pesan tanpa link cover
    const message = [
      `🎵 *${selectedSong.title}*`,
      `👤 *Artist:* ${selectedSong.artist}`,
      `📅 *Release:* ${selectedSong.release_date}`,
      "",
      `📝 *Lirik:*`,
      "",
      lyrics,
    ].join("\n");

    // Kirim gambar cover jika tersedia
    if (selectedSong.image) {
      try {
        // Download image
        const imageRes = await fetch(selectedSong.image);
        if (imageRes.ok) {
          const imageBuffer = await imageRes.arrayBuffer();
          const buffer = Buffer.from(imageBuffer);
          
          // Kirim gambar dengan caption
          await conn.sendMessage(m.chat, {
            image: buffer,
            caption: message,
            contextInfo: {
              forwardingScore: 999,
              isForwarded: false,
              externalAdReply: {
                title: selectedSong.title,
                body: selectedSong.artist,
                mediaType: 1,
                thumbnail: buffer,
                sourceUrl: ""
              }
            }
          }, { quoted: m });
          return;
        }
      } catch (e) {
        console.error("Error sending image:", e);
        // Jika gagal kirim gambar, kirim teks saja
      }
    }

    // Kirim teks saja jika gambar gagal
    await conn.sendMessage(m.chat, { text: message }, { quoted: m });
    
  } catch (e) {
    console.error("Lyrics error:", e);
    m.reply("❌ Gagal mengambil lirik. Coba lagi nanti.");
  }
};

handler.help = ["lyrics"];
handler.tags = ["internet"];
handler.command = /^(lyrics|lirik)$/i;

export default handler;