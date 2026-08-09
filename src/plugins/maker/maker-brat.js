// src/plugins/brat.js
import { sticker } from "#lib/sticker.js";
import ffmpeg from "fluent-ffmpeg";
import { promisify } from "util";
import fs from "fs";
import { exec } from "child_process";

const execAsync = promisify(exec);

async function fetchBuffer(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0" }
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const buffer = Buffer.from(await res.arrayBuffer());

      if (buffer.length < 2000)
        throw new Error("Buffer terlalu kecil / corrupt");

      return buffer;

    } catch (err) {
      if (i === retries - 1) throw err;
    }
  }
}

// Fungsi convert video ke webp sticker pakai ffmpeg
async function videoToWebp(buffer) {
  return new Promise((resolve, reject) => {
    const inputPath = `/tmp/input_${Date.now()}.mp4`;
    const outputPath = `/tmp/output_${Date.now()}.webp`;
    
    try {
      fs.writeFileSync(inputPath, buffer);
      
      ffmpeg(inputPath)
        .output(outputPath)
        .videoCodec('libwebp')
        .size('512x512')
        .fps(15)
        .addOptions([
          '-lossless 0',
          '-q:v 70',
          '-loop 0',
          '-an' // no audio
        ])
        .on('end', () => {
          try {
            const webpBuffer = fs.readFileSync(outputPath);
            fs.unlinkSync(inputPath);
            fs.unlinkSync(outputPath);
            resolve(webpBuffer);
          } catch (err) {
            reject(err);
          }
        })
        .on('error', (err) => {
          try { fs.unlinkSync(inputPath); } catch(e) {}
          try { fs.unlinkSync(outputPath); } catch(e) {}
          reject(err);
        })
        .run();
    } catch (err) {
      try { fs.unlinkSync(inputPath); } catch(e) {}
      try { fs.unlinkSync(outputPath); } catch(e) {}
      reject(err);
    }
  });
}

// Fungsi convert video ke webp pakai exec (alternatif)
async function videoToWebpExec(buffer) {
  const inputPath = `/tmp/input_${Date.now()}.mp4`;
  const outputPath = `/tmp/output_${Date.now()}.webp`;
  
  try {
    fs.writeFileSync(inputPath, buffer);
    
    const cmd = `ffmpeg -i ${inputPath} -vf "fps=15,scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=black@0" -c:v libwebp -lossless 0 -q:v 70 -loop 0 -an ${outputPath}`;
    
    await execAsync(cmd);
    
    const webpBuffer = fs.readFileSync(outputPath);
    
    fs.unlinkSync(inputPath);
    fs.unlinkSync(outputPath);
    
    return webpBuffer;
    
  } catch (err) {
    try { fs.unlinkSync(inputPath); } catch(e) {}
    try { fs.unlinkSync(outputPath); } catch(e) {}
    throw err;
  }
}

let handler = async (m, { conn, args, usedPrefix, command }) => {
  try {
    if (!args[0])
      return m.reply(`Text mana?\nContoh: ${usedPrefix + command} Halo dunia`);

    await global.loading(m, conn);

    const text = encodeURIComponent(args.join(" "));
    
    let endpoint;
    if (command === "bratvid") {
      endpoint = `https://www.keyrafara.com/maker/brat-vid?text=${text}`;
    } else {
      endpoint = `https://www.keyrafara.com/maker/brat-hd?text=${text}`;
    }

    console.log(`📤 Request to: ${endpoint}`);
    
    const buffer = await fetchBuffer(endpoint);

    let stiker;
    
    if (command === "bratvid") {
      try {
        // Coba method 1: pakai fluent-ffmpeg
        stiker = await videoToWebp(buffer);
      } catch (e1) {
        console.error('❌ Method 1 gagal:', e1.message);
        try {
          // Method 2: pakai exec
          stiker = await videoToWebpExec(buffer);
        } catch (e2) {
          console.error('❌ Method 2 gagal:', e2.message);
          // Fallback: kirim video
          return await conn.sendMessage(m.chat, {
            video: buffer,
            caption: `🎬 Brat Video\n📝 ${args.join(" ")}`,
            gifPlayback: true
          }, { quoted: m });
        }
      }
    } else {
      stiker = await sticker(buffer, {
        packName: global.config.stickpack,
        authorName: global.config.stickauth,
      });
    }

    await conn.sendMessage(m.chat, { sticker: stiker }, { quoted: m });

  } catch (e) {
    global.logger.error(e);
    m.reply(`Error: ${e.message}`);
  } finally {
    await global.loading(m, conn, true);
  }
};

handler.help = ["brat", "bratvid"];
handler.tags = ["maker"];
handler.command = /^(brat|bratvid)$/i;

export default handler;