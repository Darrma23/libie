import axios from 'axios'

let handler = async (m, { conn, text }) => {
  if (!text) return m.reply('❗ Masukkan nama kota\nContoh: .cuaca Jakarta')

  try {
    const res = await axios.get(
      'https://api.openweathermap.org/data/2.5/weather',
      {
        params: {
          q: text,
          units: 'metric',
          appid: '060a6bcfa19809c2cd4d97a212b19273'
        }
      }
    )

    const data = res.data

    const name = data.name
    const country = data.sys.country
    const weather = data.weather[0].description
    const temp = data.main.temp
    const tempMin = data.main.temp_min
    const tempMax = data.main.temp_max
    const humidity = data.main.humidity
    const wind = data.wind.speed

    return conn.reply(
      m.chat,
      `
🌍 *Cuaca Saat Ini*

📍 Lokasi: ${name}
🏳️ Negara: ${country}
🌦️ Cuaca: ${weather}
🌡️ Suhu: ${temp}°C
🔻 Minimum: ${tempMin}°C
🔺 Maksimum: ${tempMax}°C
💧 Kelembaban: ${humidity}%
🌬️ Angin: ${wind} m/s
      `.trim(),
      m
    )
  } catch (e) {
    global.logger?.error(e)
    return m.reply('❌ Lokasi tidak ditemukan atau API error')
  }
}

handler.help = ['cuaca']
handler.tags = ['info']
handler.command = /^(infocuaca|cuaca|weather)$/i
handler.desc = 'Menampilkan informasi cuaca berdasarkan nama kota'

export default handler