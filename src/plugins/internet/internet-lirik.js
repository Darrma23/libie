const handler = async (m, { conn, text }) => {
  try {
    if (!text) {
      return m.reply("Usage:\n.lyrics <song title>\nExample: .lyrics faded");
    }

    await conn.sendPresenceUpdate("composing", m.chat);

    const url =
      "https://libieapiofficial.dpdns.org/api/internet/lirik?q=" +
      encodeURIComponent(text);

    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const json = await res.json();

    if (!json.status || !json.data) {
      return m.reply("Lyrics not found.");
    }

    const song = json.data;

    const lyrics =
      song.lyrics?.length > 3500
        ? song.lyrics.slice(0, 3500) + "\n\n[lyrics truncated]"
        : song.lyrics || "Lyrics not available.";

    const message = [
      `🎵 *${song.title || "-"}*`,
      `👤 Artist: ${song.artist || "-"}`,
      `📅 Release: ${song.release_date || "-"}`,
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