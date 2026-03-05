let handler = async (m, { conn }) => {
  const id = m.sender.split("@")[0];

  // cegah spam multi instance
  global.jadibots = global.jadibots || {};

  if (global.jadibots[id]) {
    return m.reply("⚠️ Kamu sudah punya session JadiBot aktif.");
  }

  const sessionDir = `./jadibot/${id}`;

  // bikin folder session user
  await import("fs").then(fs => {
    fs.mkdirSync(sessionDir, { recursive: true });
  });

  const { startJadiBot } = await import("#lib/jadibot/start.js");

  try {
    const jbConn = await startJadiBot({
      parentConn: conn,
      m,
      sessionDir,
    });

    global.jadibots[id] = jbConn;

  } catch (e) {
    console.error(e);
    m.reply("❌ Gagal memulai JadiBot.");
  }
};

handler.help = ["jadibot"];
handler.tags = ["owner"];
handler.command = /^(jadibot)$/i;
handler.desc = [
  "Menghubungkan bot pribadi via pairing code",
  "Membuat instance WhatsApp baru",
  "Session tersimpan terpisah"
];

export default handler;