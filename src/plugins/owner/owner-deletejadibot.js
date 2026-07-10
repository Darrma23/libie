import fs from "node:fs";
import { join } from "node:path";

let handler = async (m, { text }) => {

  const jadibotDir =
    "./jadibot";

  /*
   * cek folder jadibot ada
   */
  if (
    !fs.existsSync(jadibotDir)
  ) {
    return m.reply(
      "❌ Folder jadibot tidak ditemukan."
    );
  }

  const dirs =
    fs.readdirSync(jadibotDir);

  /*
   * cuma folder nomor (numeric)
   */
  const sessions =
    dirs.filter((d) =>
      /^\d+$/.test(d)
    );

  if (!sessions.length) {
    return m.reply(
      "📂 Tidak ada session jadibot untuk dihapus."
    );
  }

  /*
   * list aja kalo ga pake argumen
   */
  if (!text) {
    let msg =
      "📂 *Session Jadibot*\n\n";

    for (const s of sessions) {
      const active =
        global.jadibots?.[s]
          ? "🟢 Aktif"
          : "🔴 Tidak aktif";

      msg += `• ${s} (${active})\n`;
    }

    msg +=
      `\nGunakan:\n` +
      `.deletejadibot 628xxx\n` +
      `.deletejadibot all`;

    return m.reply(msg);
  }

  /*
   * delete all
   */
  if (text.toLowerCase() === "all") {

    let deleted = 0;

    for (const s of sessions) {

      /*
       * stop dulu kalo masih aktif
       */
      if (global.jadibots?.[s]) {
        try {
          global.jadibots[s].ws.close();
        } catch {}
        delete global.jadibots[s];
      }

      try {

        fs.rmSync(
          join(jadibotDir, s),
          {
            recursive: true,
            force: true
          }
        );

        deleted++;

      } catch {}
    }

    return m.reply(
      `✅ ${deleted} session dihapus.`
    );
  }

  /*
   * delete specific
   */
  let number = text.replace(/\D/g, "");

  if (!sessions.includes(number)) {
    return m.reply(
      `❌ Session ${number} tidak ditemukan.\n\n` +
      `Cek daftar: \`\`\`.deletejadibot\`\`\``
    );
  }

  /*
   * stop dulu kalo masih aktif
   */
  if (global.jadibots?.[number]) {
    try {
      global.jadibots[number].ws.close();
    } catch {}
    delete global.jadibots[number];
  }

  try {

    fs.rmSync(
      join(jadibotDir, number),
      {
        recursive: true,
        force: true
      }
    );

    m.reply(
      `✅ Session ${number} dihapus.`
    );

  } catch (e) {

    m.reply(
      `❌ Gagal hapus session ${number}: ${e.message}`
    );
  }
};

handler.help = [
  "deletejadibot",
  "deletejadibot 628xxx",
  "deletejadibot all"
];
handler.tags = ["owner"];
handler.command = /^(deletejadibot|deljadibot|rmjadibot)$/i;
handler.owner = true;

export default handler;
