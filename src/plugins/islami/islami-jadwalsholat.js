const API = "https://api.myquran.com/v2/sholat"

function getToday() {
  const d = new Date()
  const y = d.toLocaleString("en-CA", { timeZone: "Asia/Jakarta", year: "numeric" })
  const m = d.toLocaleString("en-CA", { timeZone: "Asia/Jakarta", month: "2-digit" })
  const day = d.toLocaleString("en-CA", { timeZone: "Asia/Jakarta", day: "2-digit" })
  return `${y}/${m}/${day}`
}

function getTime() {
  return new Date().toLocaleTimeString("id-ID", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit"
  })
}

function getDate() {
  return new Date().toLocaleDateString("id-ID", {
    timeZone: "Asia/Jakarta",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  })
}

const fetchSchedule = async (cityId) => {
  const today = getToday()

  const res = await fetch(`${API}/jadwal/${cityId}/${today}`)
  const data = await res.json()

  if (!data.status || !data.data?.jadwal)
    throw new Error("Data tidak tersedia")

  return {
    city: data.data.lokasi,
    province: data.data.daerah,
    times: {
      imsak: data.data.jadwal.imsak,
      shubuh: data.data.jadwal.subuh,
      dzuhur: data.data.jadwal.dzuhur,
      ashr: data.data.jadwal.ashar,
      maghrib: data.data.jadwal.maghrib,
      isya: data.data.jadwal.isya
    }
  }
}

const handler = async (m, { args }) => {

  let cityId
  let cityName

  if (args.length) {

    try {
      const res = await fetch(`${API}/kota/semua`)
      const data = await res.json()

      const query = args.join(" ").toLowerCase().trim()

      const found = data.data.find(c =>
        c.lokasi.toLowerCase() === query ||
        c.lokasi.toLowerCase() === `kota ${query}` ||
        c.lokasi.toLowerCase().includes(query)
      )

      if (found) {
        cityId = found.id
        cityName = found.lokasi
      }

    } catch {}

    if (!cityId) {
      return m.reply(`❌ Kota *${args.join(" ")}* tidak ditemukan`)
    }

  }
  else if (m.isGroup) {

    const chat = global.db.data.chats[m.chat] || {}

    if (!chat.sholat?.cityId) {
      return m.reply(
`❌ Kota belum diset untuk grup ini

Gunakan:
.setsholat jakarta

Atau:
.jadwalsholat jakarta`
      )
    }

    cityId = chat.sholat.cityId
    cityName = chat.sholat.cityName

  }
  else {

    return m.reply(
`📅 *JADWAL SHOLAT*

Gunakan:
.jadwalsholat jakarta`
    )

  }

  let schedule

  try {
    schedule = await fetchSchedule(cityId)
  } catch (e) {
    return m.reply(`❌ Gagal mengambil jadwal\n${e.message}`)
  }

  const now = getTime()

  const order = ["imsak","shubuh","dzuhur","ashr","maghrib","isya"]

  const label = {
    imsak: "Imsak",
    shubuh: "Subuh",
    dzuhur: "Dzuhur",
    ashr: "Ashar",
    maghrib: "Maghrib",
    isya: "Isya"
  }

  const emoji = {
    imsak: "🌙",
    shubuh: "🌅",
    dzuhur: "☀️",
    ashr: "🌤️",
    maghrib: "🌆",
    isya: "🌙"
  }

  let nextPrayer = null

  for (const key of order) {
    if (schedule.times[key] > now) {
      nextPrayer = key
      break
    }
  }

  const rows = order.map(key => {
    const next = key === nextPrayer
    return `${emoji[key]} *${label[key]}*${next ? " ← berikutnya" : ""}: ${schedule.times[key]} WIB`
  }).join("\n")

  const dateStr = getDate()

  return m.reply(
`📅 *JADWAL SHOLAT*

🌆 ${schedule.city}${schedule.province ? `, ${schedule.province}` : ""}
📆 ${dateStr}

${rows}

⏰ Sekarang: ${now} WIB`
  )
}

handler.help = ["jadwalsholat"]
handler.tags = ["islami"]
handler.command = /^jadwalsholat$/i

export default handler