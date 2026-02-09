/**
 * @file Roblox profile viewer command handler
 * @module plugins/tools/roblox
 * @license Apache-2.0
 * @author Naruya Izumi
 */

/**
 * Displays Roblox user profile with canvas rendering
 * @async
 * @function handler
 * @param {Object} m - Message object
 * @param {Object} conn - Connection object
 * @param {Array} args - Command arguments
 * @param {string} usedPrefix - Command prefix
 * @param {string} command - Command name
 * @returns {Promise<void>}
 *
 * @description
 * Fetches Roblox user profile by username and renders
 * a rich profile card using canvas.
 *
 * @features
 * - Fetch Roblox user by username
 * - Display avatar, username, display name
 * - Show friends & followers count
 * - Render profile card via canvas
 */

import axios from "axios";
import { createCanvas, loadImage } from "@napi-rs/canvas";

/**
 * Roblox API service
 */
class RobloxService {
    async getUserId(username) {
        try {
            const res = await axios.post(
                "https://users.roblox.com/v1/usernames/users",
                {
                    usernames: [username],
                    excludeBannedUsers: false,
                }
            );
            return res.data?.data?.[0]?.id || null;
        } catch {
            return null;
        }
    }

    async getFullProfile(userId) {
        const [basic, friends, followers, headshot] = await Promise.all([
            axios.get(`https://users.roblox.com/v1/users/${userId}`),
            axios.get(`https://friends.roblox.com/v1/users/${userId}/friends/count`),
            axios.get(`https://friends.roblox.com/v1/users/${userId}/followers/count`),
            axios.get(
                `https://thumbnails.roblox.com/v1/users/avatar?userIds=${userId}&size=720x720&format=Png&isCircular=false`
            ),
        ]);

        return {
            basic: basic.data,
            friends: friends.data.count,
            followers: followers.data.count,
            avatar: headshot.data.data[0].imageUrl,
        };
    }
}

/**
 * Canvas renderer
 */
async function renderCanvas(profile) {
    const width = 1000;
    const height = 500;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    // Background
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, "#1a1b20");
    grad.addColorStop(1, "#2d2f36");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Accent block
    ctx.fillStyle = "rgba(255,255,255,0.03)";
    ctx.fillRect(550, 0, 450, 500);

    // Avatar
    const avatarRes = await axios.get(profile.avatar, { responseType: "arraybuffer" });
    const avatarImg = await loadImage(Buffer.from(avatarRes.data));

    ctx.shadowColor = "rgba(0,0,0,0.5)";
    ctx.shadowBlur = 40;
    ctx.drawImage(avatarImg, 20, 20, 460, 460);
    ctx.shadowBlur = 0;

    const x = 480;

    // Display name
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 60px sans-serif";
    ctx.fillText(profile.basic.displayName, x, 120);

    // Username
    ctx.fillStyle = "#aaaaaa";
    ctx.font = "25px monospace";
    ctx.fillText(`@${profile.basic.name}`, x, 160);

    // Stats
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 35px sans-serif";
    ctx.fillText(profile.friends.toLocaleString(), x, 300);
    ctx.fillText(profile.followers.toLocaleString(), x + 200, 300);

    ctx.fillStyle = "#888888";
    ctx.font = "18px sans-serif";
    ctx.fillText("FRIENDS", x, 330);
    ctx.fillText("FOLLOWERS", x + 200, 330);

    // Bio
    ctx.fillStyle = "#cccccc";
    ctx.font = "italic 18px sans-serif";
    const bio = profile.basic.description || "No description provided.";
    const text = bio.length > 100 ? bio.slice(0, 100) + "..." : bio;

    let y = 200;
    let line = "";
    for (const word of text.split(" ")) {
        const test = line + word + " ";
        if (ctx.measureText(test).width > 450) {
            ctx.fillText(line, x, y);
            line = word + " ";
            y += 25;
        } else {
            line = test;
        }
    }
    ctx.fillText(line, x, y);

    // Join date
    const joinDate = new Date(profile.basic.created).toLocaleDateString("id-ID", {
        year: "numeric",
        month: "long",
        day: "numeric",
    });

    ctx.fillStyle = "#555555";
    ctx.font = "16px sans-serif";
    ctx.fillText(`Join from ${joinDate}`, x, 460);

    return canvas.toBuffer("image/png");
}

/**
 * Command handler
 */
let handler = async (m, { conn, args, usedPrefix, command }) => {
    if (!args[0]) {
        return m.reply(`Masukkan username Roblox\nContoh: ${usedPrefix + command} azakunah`);
    }

    const roblox = new RobloxService();

    await global.loading(m, conn);
    try {
        const userId = await roblox.getUserId(args[0]);
        if (!userId) throw new Error("User Roblox tidak ditemukan.");

        const profile = await roblox.getFullProfile(userId);
        const buffer = await renderCanvas(profile);

        await conn.sendMessage(
            m.chat,
            {
                image: buffer,
                caption: `🎮 *Roblox Profile*\n${profile.basic.displayName} (@${profile.basic.name})`,
            },
            { quoted: m }
        );
    } catch (e) {
        global.logger.error(e);
        m.reply(`Error: ${e.message}`);
    } finally {
        await global.loading(m, conn, true);
    }
};

/**
 * Command metadata
 */
handler.help = ["roblox"];
handler.tags = ["internet"];
handler.command = /^(roblox)$/i;

handler.desc = "Menampilkan profil Roblox (avatar, display name, friends, followers) dalam bentuk kartu visual.";

export default handler;