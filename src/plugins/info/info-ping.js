let handler = async (m, { conn }) => {
  const start = Bun.nanoseconds()
  const msg = await conn.sendMessage(m.chat, { text: "" })
  const ms = ((Bun.nanoseconds() - start) / 1_000_000).toFixed(0)

  await conn.sendMessage(m.chat, {
    text: `${ms} ms`,
    edit: msg.key,
  })
}

handler.help = ["ping"]
handler.tags = ["info"]
handler.command = /^(ping)$/i
handler.desc = [
  "Mengukur latency respon bot",
  "Menampilkan waktu respon dalam milidetik",
  "Menggunakan presisi tinggi Bun.nanoseconds()"
]

export default handler