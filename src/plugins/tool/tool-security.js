import axios from "axios"
import dns from "dns/promises"

const cache = new Map()

let handler = async (m, { args }) => {
  if (!args[0]) {
    return m.reply(
      "Contoh:\n.security google.com"
    )
  }
  
  await global.loading(m, conn)

  let domain = args[0]
    .replace(/^https?:\/\//, "")
    .split("/")[0]
    .trim()

  const cached = cache.get(domain)

  if (
    cached &&
    Date.now() - cached.time <
      10 * 60 * 1000
  ) {
    return m.reply(cached.result)
  }

  const httpsUrl = `https://${domain}`
  const httpUrl = `http://${domain}`

  let score = 100

  let findings = []
  let risks = []

  let httpsActive = false
  let sslValid = false
  let redirectHttps = false

  let blacklist = false

  let spf = false
  let dmarc = false

  let finalUrl = httpsUrl

  let foundHeaders = 0

  let missingHeaders = []

  let sensitiveFound = []

  const requiredHeaders = [
    {
      key: "content-security-policy",
      name: "Content-Security-Policy"
    },
    {
      key: "x-frame-options",
      name: "X-Frame-Options"
    },
    {
      key: "x-content-type-options",
      name: "X-Content-Type-Options"
    },
    {
      key: "strict-transport-security",
      name: "Strict-Transport-Security"
    },
    {
      key: "referrer-policy",
      name: "Referrer-Policy"
    },
    {
      key: "permissions-policy",
      name: "Permissions-Policy"
    }
  ]

  const sensitivePaths = [
    "/.env",
    "/.git/config",
    "/config.json",
    "/backup.zip",
    "/database.sql",
    "/phpmyadmin",
    "/server-status"
  ]

  const addRisk = (
    text,
    penalty
  ) => {
    risks.push(
      `- ${text} (-${penalty})`
    )

    score -= penalty
  }

  try {

    // HTTPS CHECK
    const res = await axios.get(
      httpsUrl,
      {
        timeout: 10000,
        maxRedirects: 5,
        validateStatus: () => true,
        headers: {
          "User-Agent":
            "Mozilla/5.0"
        }
      }
    )

    httpsActive = true
    sslValid = true

    finalUrl =
      res.request?.res?.responseUrl ||
      httpsUrl

    // HTTP -> HTTPS CHECK
    try {
      const httpRes =
        await axios.get(httpUrl, {
          timeout: 5000,
          maxRedirects: 5,
          validateStatus: () => true,
          headers: {
            "User-Agent":
              "Mozilla/5.0"
          }
        })

      const final =
        httpRes.request?.res
          ?.responseUrl || ""

      if (
        final.startsWith(
          "https://"
        )
      ) {
        redirectHttps = true
      }

    } catch {}

    if (!redirectHttps) {
      addRisk(
        "HTTP tidak redirect ke HTTPS",
        10
      )
    }

    // SECURITY HEADERS
    const headerKeys =
      Object.keys(
        res.headers || {}
      ).map(v =>
        v.toLowerCase()
      )

    for (const h of requiredHeaders) {
      if (
        headerKeys.includes(
          h.key.toLowerCase()
        )
      ) {
        foundHeaders++
      } else {
        missingHeaders.push(
          h.name
        )

        addRisk(
          `Header ${h.name} hilang`,
          5
        )
      }
    }

    // SPF CHECK
    try {
      const txt =
        await dns.resolveTxt(
          domain
        )

      const flat = txt
        .flat()
        .join(" ")

      spf =
        flat.includes(
          "v=spf1"
        )

    } catch {}

    if (!spf) {
      addRisk(
        "SPF tidak ditemukan",
        8
      )

      findings.push(
        "SPF tidak ditemukan."
      )
    }

    // DMARC CHECK
    try {
      const txt =
        await dns.resolveTxt(
          `_dmarc.${domain}`
        )

      const flat = txt
        .flat()
        .join(" ")

      dmarc =
        flat.includes(
          "v=DMARC1"
        )

    } catch {}

    if (!dmarc) {
      addRisk(
        "DMARC tidak ditemukan",
        7
      )

      findings.push(
        "DMARC tidak ditemukan."
      )
    }

    // BLACKLIST CHECK
    try {
      const bl =
        await axios.post(
          "https://urlhaus-api.abuse.ch/v1/host/",
          new URLSearchParams({
            host: domain
          }),
          {
            timeout: 10000,
            headers: {
              "User-Agent":
                "Mozilla/5.0"
            }
          }
        )

      if (
        bl.data
          ?.query_status &&
        bl.data
          ?.query_status !==
          "no_results"
      ) {
        blacklist = true

        addRisk(
          "Domain terdeteksi blacklist",
          30
        )

        findings.push(
          "Domain terdeteksi dalam database blacklist."
        )
      }

    } catch {}

    // SENSITIVE PATH SCAN
    const checks =
      await Promise.allSettled(
        sensitivePaths.map(
          async path => {
            try {
              const r =
                await axios.get(
                  httpsUrl + path,
                  {
                    timeout: 4000,
                    validateStatus:
                      () => true,
                    headers: {
                      "User-Agent":
                        "Mozilla/5.0"
                    }
                  }
                )

              if (
                r.status ===
                200
              ) {
                return {
                  path,
                  status:
                    r.status
                }
              }

            } catch {}

            return null
          }
        )
      )

    for (const s of checks) {
      if (s.value) {
        sensitiveFound.push(
          s.value
        )
      }
    }

    if (
      sensitiveFound.length
    ) {
      addRisk(
        "Sensitive paths terdeteksi",
        15
      )

      findings.push(
        `Sensitive paths terlihat: ${sensitiveFound
          .map(v => v.path)
          .join(", ")}`
      )
    }

    // HEADER FINDINGS
    if (
      missingHeaders.length
    ) {
      findings.unshift(
        `Header keamanan belum ada: ${missingHeaders.join(", ")}.`
      )
    }

    // LIMIT SCORE
    if (score < 0)
      score = 0

    if (score > 100)
      score = 100

    // GRADE
    let grade =
      "A+ (Hardened)"

    if (score < 95)
      grade =
        "A (Sangat kuat)"

    if (score < 90)
      grade = "B (Baik)"

    if (score < 75)
      grade =
        "C (Cukup)"

    if (score < 60)
      grade =
        "D (Lemah)"

    if (score < 40)
      grade =
        "E (Berisiko)"

    const result = `
*Security Score*

*Overview*
- *Domain:* ${domain}
- *Final URL:* ${finalUrl}
- *Score:* ${score}/100
- *Grade:* ${grade}

*Checks*
- *HTTPS Aktif:* ${
      httpsActive
        ? "Ya"
        : "Tidak"
    }
- *SSL Valid:* ${
      sslValid
        ? "Ya"
        : "Tidak"
    }
- *HTTP -> HTTPS:* ${
      redirectHttps
        ? "Ya"
        : "Tidak"
    }
- *Security Headers:* ${foundHeaders}/6
- *Header Hilang:* ${
      missingHeaders.length
        ? missingHeaders.join(
            ", "
          )
        : "-"
    }
- *SPF:* ${
      spf
        ? "Ada"
        : "Tidak ada"
    }
- *DMARC:* ${
      dmarc
        ? "Ada"
        : "Tidak ada"
    }
- *Blacklist:* ${
      blacklist
        ? "Terdeteksi"
        : "Tidak terdeteksi"
    }
- *Sensitive Paths:* ${
      sensitiveFound.length
        ? "Terdeteksi"
        : "Tidak terlihat"
    }

*Risk Breakdown*
${
  risks.length
    ? risks.join("\n")
    : "- Tidak ada pengurang skor besar"
}

*Findings*
${
  findings.length
    ? findings
        .map(
          v => `- ${v}`
        )
        .join("\n")
    : "- Tidak ada temuan besar"
}

*Audit*
- *Checked At:* ${new Date().toISOString().replace("T", " ")}
- *Source:* HTTP/HTTPS target, TLS handshake, DNS TXT, URLhaus
- *Cache TTL:* 10 menit
- *Scope:* Score adalah penilaian heuristik dari sinyal teknis utama, bukan audit keamanan menyeluruh.
`.trim()

    cache.set(domain, {
      result,
      time: Date.now()
    })

    m.reply(result)

  } catch (e) {
    m.reply(
      `Gagal memeriksa domain.\n\n${e.message}`
    )
  }
  await global.loading(m, conn, true)
}

handler.help = ["security <domain>"]
handler.tags = ["tools"]
handler.command = /^(security|secscore)$/i

handler.desc = [
  "Audit keamanan dasar website",
  "Cek HTTPS, SSL, header, DNS, blacklist, dan sensitive path",
  "Menampilkan skor keamanan otomatis"
]

export default handler