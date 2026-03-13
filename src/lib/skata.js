import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

let kbbi = []

try {
    kbbi = JSON.parse(
        readFileSync(join(__dirname, 'kbbi.json'), 'utf-8')
    )
} catch {
    console.error('kbbi.json gagal dibaca')
}

const kbbiSet = new Set(kbbi)

function random(list) {
    if (!list.length) return null
    return list[Math.floor(Math.random() * list.length)]
}

function kata() {
    const huruf = random([
        'a','b','c','d','e','g','h','i','j',
        'k','l','m','n','p','r','s','t','u','w'
    ])

    const res = kbbi.filter(v => v.startsWith(huruf))

    if (!res.length) {
        return { status:false, kata:null }
    }

    return {
        status:true,
        kata: random(res)
    }
}

function cKata(input = '') {
    input = String(input).toLowerCase()

    return {
        creator:'@neoxrs – Recoded by Clicknetcafe',
        status: kbbiSet.has(input)
    }
}

export default { kata, cKata }