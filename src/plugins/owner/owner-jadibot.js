import fs from "node:fs";
import startJadiBot from "#lib/jadibot.js";

let handler = async (m, { conn, text }) => {

  global.jadibots =
    global.jadibots || {};

  if (!text) {
    return m.reply(
      "Contoh:\n.jadibot 628123456789"
    );
  }

  let number =
    text.replace(/\D/g, "");

  if (
    !number.startsWith("62")
  ) {
    return m.reply(
      "Nomor harus diawali 62"
    );
  }

  // anti multi session
  if (global.jadibots[number]) {
    return m.reply(
      "⚠️ Session nomor itu sudah aktif."
    );
  }

  const sessionDir =
    `./jadibot/${number}`;

  fs.mkdirSync(sessionDir, {
    recursive: true
  });

  try {

    await m.reply(
      "⏳ Membuat session JadiBot..."
    );

    await startJadiBot({
      parentConn: conn,
      m,
      sessionDir,
      number
    });

  } catch (e) {

    console.error(e);

    m.reply(
      `❌ Gagal memulai JadiBot.\n\n${e.message}`
    );
  }
};

handler.help = ["jadibot 628xxx"];
handler.tags = ["owner"];
handler.command = /^(jadibot)$/i;

export default handler;