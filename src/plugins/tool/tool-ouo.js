import freq from "freq-http"
import { JSDOM } from "jsdom"

async function generateRecaptchaToken() {
  try {
    const ANCHOR_URL =
      "https://www.google.com/recaptcha/api2/anchor?ar=1&k=6Lcr1ncUAAAAAH3cghg6cOTPGARa8adOf-y9zv2x&co=aHR0cHM6Ly9vdW8ucHJlc3M6NDQz&hl=en&v=pCoGBhjs9s8EhFOHJFe8cqis&size=invisible&cb=ahgyd1gkfkhe"

    const match = ANCHOR_URL.match(/(api2|enterprise)\/anchor\?(.*)/)
    if (!match) return null

    const [, versionPath, paramsString] = match
    const baseUrl = `https://www.google.com/recaptcha/${versionPath}/`

    const client = freq.create({
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      }
    })

    const anchorRes = await client.get(`${baseUrl}anchor?${paramsString}`)
    const tokenMatch = anchorRes.data.match(/"recaptcha-token" value="(.*?)"/)

    if (!tokenMatch) return null

    const token = tokenMatch[1]
    const params = Object.fromEntries(new URLSearchParams(paramsString))

    const postData = new URLSearchParams({
      v: params.v,
      reason: "q",
      c: token,
      k: params.k,
      co: params.co
    }).toString()

    const reloadRes = await client.post(`${baseUrl}reload?k=${params.k}`, postData)
    const answerMatch = reloadRes.data.match(/"rresp","(.*?)"/)

    if (!answerMatch) return null

    return answerMatch[1]
  } catch {
    return null
  }
}

async function ouoBypass(url) {
  try {
    const client = freq.create({
      headers: {
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
        referer: "https://google.com/"
      },
      maxRedirects: 0,
      validateStatus: () => true
    })

    const formattedUrl = url.replace("ouo.press", "ouo.io")
    const parsedUrl = new URL(formattedUrl)
    const id = formattedUrl.split("/").pop()

    let response = await client.get(formattedUrl)
    let nextUrl = `${parsedUrl.protocol}//${parsedUrl.host}/go/${id}`

    for (let i = 0; i < 2; i++) {
      if (response.headers.get("location")) break

      const dom = new JSDOM(response.data)
      const document = dom.window.document

      const inputs = document.querySelectorAll('input[name$="token"]')
      const formData = {}

      inputs.forEach(input => {
        formData[input.name] = input.value
      })

      const recaptcha = await generateRecaptchaToken()
      if (!recaptcha) return null

      formData["x-token"] = recaptcha

      response = await client.post(
        nextUrl,
        new URLSearchParams(formData).toString()
      )

      nextUrl = `${parsedUrl.protocol}//${parsedUrl.host}/xreallcygo/${id}`
    }

    return response.headers.get("location") || null
  } catch {
    return null
  }
}

let handler = async (m, { text }) => {

  if (!text) {
    return m.reply(
`Masukin link ouo

contoh:
.ouo https://ouo.press/xxxx`
    )
  }

  if (!/ouo\.(io|press)/i.test(text)) {
    return m.reply("Itu bukan link OUO")
  }

  await m.reply("Lagi bypass...")

  const result = await ouoBypass(text)

  if (!result) {
    return m.reply("Gagal bypass link")
  }

  m.reply(`✅ Link berhasil dibypass\n\n${result}`)
}

handler.help = ["ouo"]
handler.tags = ["tools"]
handler.command = /^(ouo|ouobypass)$/i

export default handler