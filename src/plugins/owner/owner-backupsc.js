import { exec } from "child_process";
import fs from "fs";

let handler = async (m, { conn }) => {
   
  const file = "backup-full.tar.gz";
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupName = `backup-${timestamp}.tar.gz`;

  await global.loading(m, conn);

  // Perintah tar - exclude .db dan node_modules
  const cmd = `
    tar --exclude='*.db' \
        --exclude='*.db-shm' \
        --exclude='*.db-wal' \
        --exclude='node_modules' \
        --exclude='.git' \
        --exclude='tmp' \
        -czf ${file} \
        src \
        assets \
        cookies \
        patches \
        speed.py \
        package.json \
        package-lock.json \
        README.md \
        LICENSE \
        bun.lock \
        cookies.txt \
        GEMINI.md \
        PROMPT.md \
        install.sh \
        save.sh
  `;

  exec(cmd, async (err, stdout, stderr) => {
    if (err) {
      console.error("Backup error:", err);
      console.error("Stderr:", stderr);
      return m.reply(`❌ Backup gagal!\n\nError: ${err.message || "Unknown error"}`);
    }

    try {
      // Cek file backup
      if (!fs.existsSync(file)) {
        return m.reply("❌ File backup tidak ditemukan!");
      }

      const stats = fs.statSync(file);
      const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);

      if (stats.size === 0) {
        fs.unlinkSync(file);
        return m.reply("❌ File backup kosong!");
      }

      // Kirim ke WhatsApp
      await conn.sendMessage(
        m.chat,
        {
          document: fs.readFileSync(file),
          mimetype: "application/gzip",
          fileName: backupName,
          caption: `✅ *Backup Berhasil!*\n\n📦 *File:* ${backupName}\n📊 *Ukuran:* ${fileSizeMB} MB\n📅 *Tanggal:* ${new Date().toLocaleString('id-ID')}\n\n📝 *Termasuk:*\n✅ Source code (src/)\n✅ Assets (assets/)\n✅ File konfigurasi\n✅ Package files\n\n❌ *Tidak termasuk:*\n❌ Database (.db)\n❌ node_modules\n❌ Temporary files`
        },
        { quoted: m }
      );

      // Hapus file setelah terkirim
      fs.unlinkSync(file);

    } catch (error) {
      console.error("Send file error:", error);
      return m.reply(`❌ Gagal mengirim file!\n\nError: ${error.message}`);
    }
  });
};

// Handler untuk backup database saja
let dbHandler = async (m, { conn }) => {
  if (!global.owner?.includes(m.sender.split("@")[0])) {
    return m.reply("❌ Khusus Owner!");
  }

  const dbFile = "database-backup.tar.gz";
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupName = `database-${timestamp}.tar.gz`;

  const cmd = `
    tar -czf ${dbFile} \
    src/database/*.db \
    src/database/*.db-shm \
    src/database/*.db-wal \
    2>&1
  `;

  exec(cmd, async (err) => {
    if (err) {
      console.error("DB Backup error:", err);
      return m.reply("❌ Backup database gagal!");
    }

    if (!fs.existsSync(dbFile)) {
      return m.reply("❌ File database tidak ditemukan!");
    }

    const stats = fs.statSync(dbFile);
    const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);

    await conn.sendMessage(
      m.chat,
      {
        document: fs.readFileSync(dbFile),
        mimetype: "application/gzip",
        fileName: backupName,
        caption: `✅ *Backup Database Berhasil!*\n\n📦 *File:* ${backupName}\n📊 *Ukuran:* ${fileSizeMB} MB\n📅 *Tanggal:* ${new Date().toLocaleString('id-ID')}\n\n📝 *Termasuk:*\n✅ auth.db\n✅ database.db\n✅ WAL files`
      },
      { quoted: m }
    );

    fs.unlinkSync(dbFile);
    await global.loading(m, conn, true);
  });
};

// Export handler utama dan dbHandler
handler.help = ["backupsc", "backupdb"];
handler.tags = ["owner"];
handler.command = ["backupsc", "backupfull", "backupdb"];
handler.owner = true;

export default handler;
