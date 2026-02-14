import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas'
import { join } from 'path'

GlobalFonts.registerFromPath(
  join(process.cwd(), 'src/lib/Cobbler-SemiBold.ttf'),
  'Cobbler'
)

function drawRoundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

export async function weatherCanvas(data) {
  const W = 1200
  const H = 630

  const canvas = createCanvas(W, H)
  const ctx = canvas.getContext('2d')

  const theme = pickTheme(data.weather)

  // ===== Background =====
  try {
    const bg = await loadImage(theme.bg)
    ctx.filter = 'blur(25px) brightness(0.7)'
    ctx.drawImage(bg, -50, -50, W + 100, H + 100)
    ctx.filter = 'none'
  } catch {
    const grad = ctx.createLinearGradient(0, 0, 0, H)
    grad.addColorStop(0, theme.top)
    grad.addColorStop(1, theme.bottom)
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, W, H)
  }

  ctx.fillStyle = 'rgba(0,0,0,0.35)'
  ctx.fillRect(0, 0, W, H)

  // ===== Glass Card =====
  const cardW = 820
  const cardH = 420
  const cardX = W - cardW - 80
  const cardY = (H - cardH) / 2
  const radius = 28

  ctx.save()
  ctx.shadowColor = 'rgba(0,0,0,0.9)'
  ctx.shadowBlur = 50
  ctx.fillStyle = 'rgba(0,0,0,0.45)'
  drawRoundedRect(ctx, cardX, cardY, cardW, cardH, radius)
  ctx.fill()
  ctx.restore()

  ctx.save()
  ctx.fillStyle = 'rgba(255,255,255,0.05)'
  drawRoundedRect(ctx, cardX, cardY, cardW, cardH, radius)
  ctx.fill()

  ctx.strokeStyle = 'rgba(255,255,255,0.12)'
  ctx.stroke()
  ctx.restore()

  // ===== Icon =====
  const iconUrl = `https://openweathermap.org/img/wn/${data.icon}@4x.png`
  try {
    const icon = await loadImage(iconUrl)
    ctx.drawImage(icon, 90, 170, 220, 220)
  } catch {}

  // ===== Accent Bar =====
  const accentGrad = ctx.createLinearGradient(cardX - 25, cardY, cardX - 25, cardY + cardH)
  accentGrad.addColorStop(0, theme.accent)
  accentGrad.addColorStop(1, '#ffffff')

  ctx.save()
  ctx.shadowColor = theme.accent
  ctx.shadowBlur = 20
  ctx.fillStyle = accentGrad
  ctx.fillRect(cardX - 25, cardY + 40, 8, cardH - 80)
  ctx.restore()

  // ===== Text =====
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 46px Cobbler'
  ctx.fillText(`${data.name}, ${data.country}`, cardX + 40, cardY + 80)

  ctx.fillStyle = 'rgba(255,255,255,0.85)'
  ctx.font = '28px Cobbler'
  ctx.fillText(capitalize(data.description), cardX + 40, cardY + 125)

  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 72px Cobbler'
  ctx.fillText(`${Math.round(data.temp)}°C`, cardX + 40, cardY + 210)

  ctx.fillStyle = 'rgba(255,255,255,0.75)'
  ctx.font = '26px Cobbler'
  ctx.fillText(`Feels Like : ${Math.round(data.feels)}°C`, cardX + 40, cardY + 270)
  ctx.fillText(`Humidity   : ${data.humidity}%`, cardX + 40, cardY + 310)
  ctx.fillText(`Wind       : ${data.wind} km/h`, cardX + 40, cardY + 350)

  return canvas.toBuffer('image/png')
}

// ===== Theme Logic =====
function pickTheme(weather) {
  weather = weather.toLowerCase()

  if (weather.includes('clear'))
    return theme('clear')

  if (weather.includes('cloud'))
    return theme('clouds')

  if (weather.includes('rain'))
    return theme('rain')

  if (weather.includes('thunderstorm'))
    return theme('storm')

  if (weather.includes('snow'))
    return theme('snow')

  if (weather.includes('mist') || weather.includes('fog') || weather.includes('haze'))
    return theme('mist')

  return theme('default')
}

function theme(type) {
  const map = {
    clear: {
      bg: 'https://images.unsplash.com/photo-1501973801540-537f08ccae7b',
      accent: '#00e5ff',
      top: '#56ccf2',
      bottom: '#2f80ed'
    },
    clouds: {
      bg: 'https://images.unsplash.com/photo-1499346030926-9a72daac6c63',
      accent: '#90a4ae',
      top: '#bdc3c7',
      bottom: '#2c3e50'
    },
    rain: {
      bg: 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29',
      accent: '#4fc3f7',
      top: '#314755',
      bottom: '#26a0da'
    },
    storm: {
      bg: 'https://images.unsplash.com/photo-1500673922987-e212871fec22',
      accent: '#7c4dff',
      top: '#141e30',
      bottom: '#243b55'
    },
    snow: {
      bg: 'https://images.unsplash.com/photo-1483664852095-d6cc6870702d',
      accent: '#ffffff',
      top: '#e6dada',
      bottom: '#274046'
    },
    mist: {
      bg: 'https://images.unsplash.com/photo-1482192596544-9eb780fc7f66',
      accent: '#cfd8dc',
      top: '#757f9a',
      bottom: '#d7dde8'
    },
    default: {
      bg: null,
      accent: '#00ff99',
      top: '#0f2027',
      bottom: '#2c5364'
    }
  }

  return map[type]
}

function capitalize(text = '') {
  return text.charAt(0).toUpperCase() + text.slice(1)
}