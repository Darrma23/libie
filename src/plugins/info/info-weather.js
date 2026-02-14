/**
 * @file Weather information command handler
 * @module plugins/info/cuaca
 * @license Apache-2.0
 * @author Naruya Izumi
 */

import axios from 'axios'
import { weatherCanvas } from '#canvas/weather.js'

const APIKEY = '060a6bcfa19809c2cd4d97a212b19273' // ← apikey lu

let handler = async (m, { conn, text }) => {
  if (!text) {
    return m.reply('❗ Masukkan nama kota\nContoh: .cuaca Jakarta')
  }

  await global.loading(m, conn)

  try {
    const res = await axios.get(
      'https://api.openweathermap.org/data/2.5/weather',
      {
        params: {
          q: text,
          units: 'metric',
          appid: APIKEY
        }
      }
    )

    const d = res.data

    const payload = {
      name: d.name,
      country: d.sys.country,
      description: d.weather[0].description,
      weather: d.weather[0].main,
      temp: d.main.temp,
      feels: d.main.feels_like,
      humidity: d.main.humidity,
      wind: d.wind.speed,
      icon: d.weather[0].icon
    }

    const canvasBuffer = await weatherCanvas(payload)

    const caption =
`🌍 *Cuaca Saat Ini*

📍 Lokasi : ${payload.name}, ${payload.country}
🌦️ Cuaca : ${payload.description}
🌡️ Suhu  : ${payload.temp}°C
🤔 Feels : ${payload.feels}°C
💧 Humid : ${payload.humidity}%
🌬️ Angin : ${payload.wind} m/s`

    await conn.sendMessage(
      m.chat,
      {
        text: caption,
        contextInfo: {
          externalAdReply: {
            showAdAttribution: true,
            title: `Cuaca ${payload.name}`,
            body: payload.description,
            thumbnail: canvasBuffer,
            mediaType: 1,
            mediaUrl: `https://openweathermap.org/city/${d.id}`,
            sourceUrl: `https://openweathermap.org/city/${d.id}`,
            renderLargerThumbnail: true
          }
        }
      },
      { quoted: m }
    )

  } catch (e) {
    global.logger?.error(e?.response?.data || e)
    return m.reply('❌ Lokasi tidak ditemukan / API error')
  } finally {
    await global.loading(m, conn, true)
  }
}

handler.help = ['cuaca <kota>']
handler.tags = ['info']
handler.command = /^(cuaca|weather)$/i

handler.desc = [
  'Menampilkan informasi cuaca real-time',
  'Menggunakan OpenWeatherMap API',
  'Dilengkapi kartu visual (canvas)',
  'Rich preview modern'
]

export default handler