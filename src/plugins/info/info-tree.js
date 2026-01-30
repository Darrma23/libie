import fs from 'fs'
import path from 'path'

let handler = async (m) => {
    const root = process.cwd()

    let lines = []
    let stats = {
        totalFiles: 0,
        totalDirs: 0,
        perFolder: {} // { path: count }
    }

    walk(root, '', lines, stats, root)

    let output = lines.join('\n')

    output += `\n\n📁 Total folder: ${stats.totalDirs}`
    output += `\n📄 Total file: ${stats.totalFiles}`

    // ================= PERSENTASE =================
    output += `\n\n📊 Persentase file per folder:`

    const sorted = Object.entries(stats.perFolder)
        .sort((a, b) => b[1] - a[1])

    for (const [folder, count] of sorted) {
        const percent = ((count / stats.totalFiles) * 100).toFixed(2)
        output += `\n- ${folder}: ${count} file (${percent}%)`
    }

    m.reply(output)
}

handler.help = ['tree']
handler.tags = ['info']
handler.command = /^tree$/i
handler.owner = true

handler.desc = [
  "Menampilkan struktur direktori project bot dalam bentuk tree",
  "Menghitung total folder dan total file di project",
  "Menampilkan statistik jumlah file per folder",
  "Menghitung persentase file tiap folder terhadap total file",
  "Mengabaikan folder tersembunyi dan node_modules",
  "Berguna untuk audit struktur dan skala project"
]

export default handler

/* ================= CORE WALK ================= */

function walk(dir, prefix, out, stats, root) {
    let items = fs.readdirSync(dir, { withFileTypes: true })
        .filter(i =>
            i.name !== 'node_modules' &&
            !i.name.startsWith('.') // 🔥 HILANGKAN .git, .env, dll
        )
        .sort((a, b) => {
            if (a.isDirectory() && !b.isDirectory()) return -1
            if (!a.isDirectory() && b.isDirectory()) return 1
            return a.name.localeCompare(b.name)
        })

    items.forEach((item, index) => {
        const isLast = index === items.length - 1
        const branch = isLast ? '└── ' : '├── '
        const nextPrefix = prefix + (isLast ? '    ' : '│   ')
        const fullPath = path.join(dir, item.name)
        const relative = path.relative(root, fullPath)

        out.push(prefix + branch + item.name)

        if (item.isDirectory()) {
            stats.totalDirs++
            walk(fullPath, nextPrefix, out, stats, root)
        } else {
            stats.totalFiles++

            const folder = path.dirname(relative)
            stats.perFolder[folder] ??= 0
            stats.perFolder[folder]++
        }
    })
}