let handler = async (m, { conn, text, usedPrefix, command }) => {
  try {
    if (!text)
      return m.reply(`Teks mana?\nContoh:\n${usedPrefix + command} halo kamu`);

    await global.loading(m, conn);

    const url = `https://api-faa.my.id/faa/ai-hyper?text=${encodeURIComponent(text)}`;

    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/json"
      }
    });

    if (!res.ok)
      throw new Error(`API Error ${res.status}`);

    const json = await res.json();

    if (!json?.status)
      throw new Error("API gagal / status false");

    const reply =
      json.result ||
      json.message ||
      "AI tidak memberikan respon.";

    await conn.reply(m.chat, reply, m);

  } catch (e) {
    global.logger.error(e);
    m.reply(`Error: ${e.message}`);
  } finally {
    await global.loading(m, conn, true);
  }
};

handler.help = ["ai"];
handler.tags = ["ai"];
handler.command = /^(ai)$/i;

export default handler;