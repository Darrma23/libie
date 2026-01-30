const handler = async (m, { conn, text }) => {
  try {
    if (!text) {
      return m.reply("Usage:\n.lyrics <song title>\nExample: .lyrics mawar hitam");
    }

    await conn.sendPresenceUpdate("composing", m.chat);

    // GANTI URL INI sesuai endpoint asli API lu
    const url =
      "https://api.nekolabs.web.id/discovery/lyrics/search?q=" +
      encodeURIComponent(text);

    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const json = await res.json();

    if (!json.success || !Array.isArray(json.result) || !json.result.length) {
      return m.reply("Lyrics not found.");
    }

    // Ambil result pertama (paling relevan)
    const song = json.result[0];

    const durationMin = song.duration
      ? `${Math.floor(song.duration / 60)}:${String(
          Math.floor(song.duration % 60)
        ).padStart(2, "0")}`
      : "-";

    // Batasi lyrics biar ga jebol limit WA
    const lyrics =
      song.plainLyrics?.length > 3500
        ? song.plainLyrics.slice(0, 3500) + "\n\n[lyrics truncated]"
        : song.plainLyrics || "Lyrics not available.";

    const message = [
      `🎵 *${song.trackName || song.name}*`,
      `👤 Artist: ${song.artistName}`,
      `💿 Album: ${song.albumName || "-"}`,
      `⏱ Duration: ${durationMin}`,
      "",
      lyrics,
    ].join("\n");

    await conn.sendMessage(
      m.chat,
      { text: message },
      { quoted: m }
    );
  } catch (e) {
    console.error(e);
    m.reply("Failed to fetch lyrics.");
  }
};

handler.help = ["lyrics"];
handler.tags = ["internet"];
handler.command = /^(lyrics|lirik)$/i;

export default handler;