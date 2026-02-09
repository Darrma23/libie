import { promises as fs } from 'fs'
import { exec } from 'child_process'
import path from 'path'

let handler = async (m, { conn, args, usedPrefix, command }) => {
  let q = m.quoted || m
  let mime = q.mimetype || q.msg?.mimetype || ''

  if (!/audio/.test(mime))
    throw `Balas VN / audio dengan caption *${usedPrefix + command}*`

  let audio = await q.download()
  if (!audio) throw 'Gagal download audio'

  let filter = null

  if (/bass/i.test(command)) filter = `-af equalizer=f=94:width_type=o:width=2:g=30`
  else if (/blown/i.test(command)) filter = `-af acrusher=.1:1:64:0:log`
  else if (/deep/i.test(command)) filter = `-af atempo=1,asetrate=44100*0.7`
  else if (/earrape/i.test(command)) filter = `-af volume=20`
  else if (/fast/i.test(command)) filter = `-af atempo=1.25`
  else if (/fat/i.test(command)) filter = `-af atempo=1.6`
  else if (/nightcore/i.test(command)) filter = `-af atempo=1.06,asetrate=44100*1.25`
  else if (/reverse/i.test(command)) filter = `-filter_complex areverse`
  else if (/robot/i.test(command))
    filter =
      `-filter_complex afftfilt=real='hypot(re,im)*sin(0)':imag='hypot(re,im)*cos(0)'`
  else if (/slow/i.test(command)) filter = `-af atempo=0.7`
  else if (/smooth/i.test(command)) filter = `-af afftdn`
  else if (/tupai|squirrel|chipmunk/i.test(command))
    filter = `-af atempo=0.5,asetrate=65100`
  else if (/vibra/i.test(command)) filter = `-af vibrato=f=15`

  if (!filter) throw 'Efek audio tidak dikenal'

  let tmpDir = './tmp'
  await fs.mkdir(tmpDir, { recursive: true })

  let id = Date.now()
  let input = path.join(tmpDir, `${id}.input`)
  let output = path.join(tmpDir, `${id}.mp3`)

  await fs.writeFile(input, audio)

  await m.reply('⏳ Processing audio...')

  exec(`ffmpeg -y -i "${input}" ${filter} "${output}"`, async (err) => {
    await fs.unlink(input).catch(() => {})

    if (err) {
      await fs.unlink(output).catch(() => {})
      throw 'Gagal memproses audio'
    }

    let buff = await fs.readFile(output)

    await conn.sendMessage(
      m.chat,
      {
        audio: buff,
        mimetype: 'audio/mpeg',
        ptt: /vn/i.test(args[0])
      },
      { quoted: m }
    )

    await fs.unlink(output).catch(() => {})
  })
}

handler.help = [
  'bass',
  'blown',
  'deep',
  'earrape',
  'fast',
  'fat',
  'nightcore',
  'reverse',
  'robot',
  'slow',
  'smooth',
  'tupai',
  'vibra'
]

handler.help = [
  'bass',
  'blown',
  'deep',
  'earrape',
  'fast',
  'fat',
  'nightcore',
  'reverse',
  'robot',
  'slow',
  'smooth',
  'tupai',
  'vibra'
]

handler.tags = ['tools']

handler.command =
  /^(bass|blown|deep|earrape|fast|fat|nightcore|reverse|robot|slow|smooth|tupai|squirrel|chipmunk|vibra)$/i

handler.desc = [
  'Mengubah audio atau voice note dengan berbagai efek suara',
  'Gunakan dengan cara reply audio atau VN',
  'Efek tersedia: bass, blown, deep, earrape, fast, fat, nightcore, reverse, robot, slow, smooth, tupai, vibra',
  'Diproses menggunakan ffmpeg'
]

export default handler