import fs from "node:fs";

let handler = async (m, { text, conn }) => {

  global.jadibots =
    global.jadibots || {};

  const numbers = Object.keys(
    global.jadibots
  );

  if (!numbers.length) {
    return m.reply(
      "❌ Tidak ada jadibot aktif."
    );
  }

  /*
   * stop all
   */
  if (
    !text ||
    text.toLowerCase() === "all"
  ) {

    for (const num of numbers) {

      try {

        global.jadibots[num].ws.close();

      } catch {}

      try {

        fs.rmSync(
          `./jadibot/${num}`,
          {
            recursive: true,
            force: true
          }
        );

      } catch {}

      delete global.jadibots[num];
    }

    return m.reply(
      `✅ ${numbers.length} jadibot dihentikan.`
    );
  }

  /*
   * stop specific
   */
  let number = text.replace(/\D/g, "");

  if (!global.jadibots[number]) {
    return m.reply(
      `❌ Jadibot ${number} tidak ditemukan.`
    );
  }

  try {

    global.jadibots[number].ws.close();

  } catch {}

  try {

    fs.rmSync(
      `./jadibot/${number}`,
      {
        recursive: true,
        force: true
      }
    );

  } catch {}

  delete global.jadibots[number];

  m.reply(
    `✅ Jadibot ${number} dihentikan.\nSession dihapus.`
  );
};

handler.help = [
  "stopjadibot",
  "stopjadibot all",
  "stopjadibot 628xxx"
];
handler.tags = ["owner"];
handler.command = /^(stopjadibot)$/i;
handler.owner = true;

export default handler;
