let handler = async (m, { conn }) => {
  let u = global.rpg.data.user[m.sender]

  let {
    paus,
    kepiting,
    gurita,
    cumi,
    buntal,
    dory,
    lumba,
    lobster,
    hiu,
    udang,
    ikan,
    orca,
    pancingan,
    anakpancingan,
    umpan
  } = u

  // Label level pancingan
  let levelLabel = 'Tidak Punya'
  if (pancingan > 0 && pancingan < 5) levelLabel = `Level ${pancingan}`
  if (pancingan === 5) levelLabel = 'Level MAX'

  // Progress pancingan
  let progress = 'Tidak punya pancingan'
  if (pancingan > 0 && pancingan < 5) {
    progress = `Level *${pancingan}* ➜ Level *${pancingan + 1}*\n│Exp *${anakpancingan}* ➜ *${pancingan * 10000}*`
  } else if (pancingan === 5) {
    progress = '*Max Level*'
  }

  let text = `
*Fish Pond*
Hiu : ${hiu}
Ikan : ${ikan}
Dory : ${dory}
Orca : ${orca}
Paus : ${paus}
Cumi : ${cumi}
Gurita : ${gurita}
Buntal : ${buntal}
Udang : ${udang}
Lumba² : ${lumba}
Lobster : ${lobster}
Kepiting : ${kepiting}

Umpan : ${umpan}

*Level Pancingan*
Pancingan : *${levelLabel}*
`.trim()

  conn.reply(m.chat, text, m)
}

handler.help = ['kolam']
handler.tags = ['rpg']
handler.command = /^(kolam)$/i
handler.limit = true
handler.group = true

export default handler