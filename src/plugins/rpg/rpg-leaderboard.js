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

  // ===== RENDER + MENTIONS =====
  const render = async (title, key, list, suffix) => {
    const myRank = rankOf(list);
    const mentions = [];

    const lines = await Promise.all(
      list.slice(0, len).map(async (u, i) => {
        let name;

        if (inGroup(u.jid)) {
          name = `@${u.jid.split("@")[0]}`;
          mentions.push(u.jid);
        } else {
          name = "@";
        }

        return `${i + 1}. ${name} *${u[key]} ${suffix}*`;
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