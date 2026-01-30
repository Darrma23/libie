const FREE_EXP = 5000;
const PREM_EXP = 10000;
const FREE_MONEY = 5000;
const PREM_MONEY = 10000;

const COOLDOWN = 24 * 60 * 60 * 1000; // 24 jam

let handler = async (m, { conn, isPrems }) => {
  const user = global.rpg.data.user[m.sender];
  const now = Date.now();

  const last = user.lastclaim || 0;
  const next = last + COOLDOWN;

  if (now < next) {
    return m.reply(
      `Kamu sudah klaim daily hari ini.\n` +
      `Tunggu *${msToTime(next - now)}* lagi.`
    );
  }

  const exp = isPrems ? PREM_EXP : FREE_EXP;
  const money = isPrems ? PREM_MONEY : FREE_MONEY;

  user.exp += exp;
  user.money += money;
  user.lastclaim = now;

  return m.reply(
    `🎁 *DAILY REWARD*\n\n` +
    `+${exp} EXP\n` +
    `+${money} Money\n\n` +
    `Datang lagi besok.`
  );
};

handler.help = ["daily"];
handler.tags = ["rpg"];
handler.command = /^daily$/i;

handler.register = true;

export default handler;

function msToTime(ms) {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);

  return `${h} jam ${m} menit ${s} detik`;
}