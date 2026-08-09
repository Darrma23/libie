let handler = async (m, { conn, args, participants }) => {
  if (typeof global.getAllUsers !== "function") {
    return conn.reply(
      m.chat,
      "Database belum siap. getAllUsers() tidak ditemukan.",
      m
    );
  }

  const users = global.getAllUsers().map((u) => ({
    jid: u.jid,
    exp: Number(u.exp) || 0,
    level: Number(u.level) || 0,
    money: Number(u.money) || 0,
    limit: Number(u.user_limit) || 0,
  }));

  if (!users.length) {
    return conn.reply(m.chat, "Belum ada data user.", m);
  }

  const len = Math.min(
    Math.max(parseInt(args[0]) || 10, 1),
    10,
    users.length
  );

  const sortDesc = (key) => [...users].sort((a, b) => b[key] - a[key]);

  const expRank = sortDesc("exp");
  const levelRank = sortDesc("level");
  const moneyRank = sortDesc("money");
  const limitRank = sortDesc("limit");

  const rankOf = (list) =>
    list.findIndex((u) => u.jid === m.sender) + 1;

  const inGroup = (jid) =>
    participants.some((p) => p.id === jid || p.jid === jid);

  // ===== FUNGSI GET NICKNAME =====
  const getNickname = async (jid) => {
    try {
      // 1. Cari di participants group
      const participant = participants.find(p => p.id === jid || p.jid === jid);
      if (participant?.name) return participant.name;
      
      // 2. Cari di kontak (pakai conn)
      try {
        const contact = await conn.sendMessage(jid, { 
          react: { text: '✅', key: { remoteJid: jid } } 
        }).catch(() => {});
      } catch {}
      
      // 3. Coba dapatkan nama dari profil
      try {
        const profile = await conn.profilePictureUrl(jid, 'image').catch(() => null);
      } catch {}
      
      // 4. Cari di database user
      const userDb = global.db?.data?.users?.[jid];
      if (userDb?.name) return userDb.name;
      
      // 5. Cari di kontak global
      if (global.contacts?.[jid]?.name) return global.contacts[jid].name;
      if (global.contacts?.[jid]?.notify) return global.contacts[jid].notify;
      
      // 6. Coba dapatkan nama dari cache
      if (global.nameCache?.[jid]) return global.nameCache[jid];
      
      // 7. Fallback: nomor HP
      return jid.split("@")[0];
    } catch {
      return jid.split("@")[0];
    }
  };

  // ===== RENDER =====
  const render = async (title, key, list, suffix) => {
    const myRank = rankOf(list);
    const mentions = [];

    const lines = await Promise.all(
      list.slice(0, len).map(async (u, i) => {
        let displayName;
        const isInGroup = inGroup(u.jid);
        const nickname = await getNickname(u.jid);

        if (isInGroup) {
          // Jika di group: tag + nickname
          displayName = `@${u.jid.split("@")[0]} (${nickname})`;
          mentions.push(u.jid);
        } else {
          // Jika tidak di group: nickname aja
          displayName = `(${nickname})`;
        }

        return `${i + 1}. ${displayName} *${u[key]} ${suffix}*`;
      })
    );

    const text = `
• *${title} Top ${len}* •
Kamu: *${myRank || "-"}* dari *${list.length}*

${lines.join("\n")}
`.trim();

    return { text, mentions };
  };

  const sections = await Promise.all([
    render("XP Leaderboard", "exp", expRank, "XP"),
    render("Limit Leaderboard", "limit", limitRank, "Limit"),
    render("Level Leaderboard", "level", levelRank, "Level"),
    render("Money Leaderboard", "money", moneyRank, "Money"),
  ]);

  const text = sections.map((s) => s.text).join("\n\n");
  const mentions = sections.flatMap((s) => s.mentions);

  await conn.reply(
    m.chat,
    text,
    m,
    { mentions }
  );
};

handler.help = ["leaderboard"];
handler.tags = ["rpg"];
handler.command = /^(leaderboard|lb)$/i;
handler.group = true;
handler.limit = true;

export default handler;