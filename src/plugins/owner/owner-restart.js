let handler = async (m) => {
    await m.reply("♻️ Restarting bot...");
    process.exit(0);
};

handler.command = ["restart"];
handler.owner = true;
handler.tags = ["owner"];

export default handler;