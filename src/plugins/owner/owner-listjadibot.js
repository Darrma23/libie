let handler = async (m, { conn }) => {

  global.jadibots =
    global.jadibots || {};

  const numbers = Object.keys(
    global.jadibots
  );

  if (!numbers.length) {
    return m.reply(
      "📋 *Daftar JadiBot*\n\nTidak ada jadibot aktif."
    );
  }

  let text =
    "📋 *Daftar JadiBot*\n\n";

  let i = 1;

  for (const num of numbers) {

    const bot =
      global.jadibots[num];

    const wsState =
      bot?.ws?.readyState === 1
        ? "✅ Terhubung"
        : "⏳ Terputus";

    text +=
      `${i}. *${num}*\n` +
      `   Status: ${wsState}\n\n`;

    i++;
  }

  text +=
    `Total: ${numbers.length} jadibot`;

  m.reply(text);
};

handler.help = [
  "listjadibot"
];
handler.tags = ["owner"];
handler.command = /^(listjadibot)$/i;
handler.owner = true;

export default handler;
