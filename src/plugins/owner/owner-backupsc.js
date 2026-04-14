import { exec } from "child_process";
import fs from "fs";

let handler = async (m, { conn }) => {

  const file = `libie.tar.gz`;

  const cmd = `
    tar \
    --exclude=src/database/*.db-shm \
    --exclude=src/database/*.db-wal \
    -czf ${file} \
    src \
    speed.py \
    package.json \
    package-lock.json \
    README.md \
    LICENSE
  `;

  await global.loading(m, conn);

  exec(cmd, async (err) => {
    if (err && err.code !== 1) {
      console.error(err);
      return m.reply("Backup gagal.");
    }

    await conn.sendMessage(
      m.chat,
      {
        document: fs.readFileSync(file),
        mimetype: "application/gzip",
        fileName: file
      },
      { quoted: m }
    );

    fs.unlinkSync(file);
    await global.loading(m, conn, true);
  });
};

handler.help = ["backup"];
handler.tags = ["owner"];
handler.command = ["backup"];

handler.owner = true;

export default handler;