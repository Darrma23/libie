import { randomBytes } from "crypto"

let handler = async (m, { conn, text }) => {
  if (!text && !m.quoted)
    return m.reply("❗ Reply media atau kasih teks")

  const groups = global.sqlite
    .query("SELECT jid FROM chats WHERE isGroup = 1")
    .all()
    .map(v => v.jid)

  if (!groups.length)
    return m.reply("Tidak ada group di database")

  const teks = text
    ? /bcgc/i.test(text)
      ? text
      : text +
        "\n" +
        readMore +
        "「 Broadcast Group 」\n" +
        randomID(32)
    : ""

  await conn.reply(
    m.chat,
    `_Mengirim broadcast ke ${groups.length} group_`,
    m
  )

  for (let jid of groups) {
    try {
      if (m.quoted && m.quoted.mtype) {
        let q = await m.getQuotedObj()
        let mime = (q.msg || q).mimetype || ""

        if (/image/.test(mime)) {
          let buffer = await q.download()
          await conn.sendMessage(jid, {
            image: buffer,
            caption: teks,
            contextInfo: {
              forwardingScore: 99,
              isForwarded: true
            }
          })
        }

        else if (/video/.test(mime)) {
          let buffer = await q.download()
          await conn.sendMessage(jid, {
            video: buffer,
            caption: teks,
            contextInfo: {
              forwardingScore: 99,
              isForwarded: true
            }
          })
        }

        else if (/audio/.test(mime)) {
          let buffer = await q.download()
          await conn.sendMessage(jid, {
            audio: buffer,
            mimetype: mime,
            ptt: false,
            contextInfo: {
              forwardingScore: 99,
              isForwarded: true
            }
          })
        }

        else {
          await conn.sendMessage(jid, {
            text: teks,
            contextInfo: {
              forwardingScore: 99,
              isForwarded: true
            }
          })
        }
      }

      else {
        await conn.sendMessage(jid, {
          text: teks,
          contextInfo: {
            forwardingScore: 99,
            isForwarded: true
          }
        })
      }
    } catch (err) {
      global.logger?.warn({ jid, err: err.message }, "Broadcast gagal")
    }

    await delay(1500)
  }

  await m.reply("✅ Selesai Broadcast Group :)")
}

handler.help = ["bcgc"]
handler.tags = ["owner"]
handler.command = /^(bcgc)$/i
handler.owner = true

export default handler

const more = String.fromCharCode(8206)
const readMore = more.repeat(4001)

const randomID = length =>
  randomBytes(Math.ceil(length * 0.5))
    .toString("hex")
    .slice(0, length)

const delay = ms => new Promise(resolve => setTimeout(resolve, ms))