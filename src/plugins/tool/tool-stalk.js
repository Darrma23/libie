/**
 * @file Universal stalker for WhatsApp, TikTok, and social media profiles
 * @module plugins/tool/stalk
 * @description Fetches and displays detailed information about WhatsApp users, business accounts,
 * groups, channels, and TikTok profiles. Supports multiple input formats.
 * @license Apache-2.0
 * @author Naruya Izumi
 */
 
import axios from "axios";
import * as cheerio from "cheerio";

/**
 * Main command handler for stalking profiles
 * @async
 * @function handler
 * @param {Object} m - Message object
 * @param {Object} extra - Extra context
 * @param {Object} extra.conn - Connection object
 * @param {string} extra.text - Command arguments
 * @param {Array} extra.args - Command arguments array
 * @param {string} extra.usedPrefix - Used prefix
 * @param {string} extra.command - Command name
 * @returns {Promise<void>}
 *
 * @description
 * Universal stalking command that can fetch information about:
 * - WhatsApp users (normal accounts)
 * - WhatsApp Business accounts
 * - WhatsApp Groups
 * - WhatsApp Channels
 * - TikTok profiles
 *
 * @features
 * - User profiles with status and business info
 * - Group metadata with members and admins
 * - Channel information with subscriber count
 * - TikTok profile stats
 * - Multiple input formats (number, mention, quoted, URL, flag)
 * - Auto-detection of input type
 * - Profile picture display
 *
 * @usage
 * - .stalk → Example usage
 * - .stalk 628123456789 → Stalk WhatsApp user by number
 * - .stalk @mention → Stalk mentioned WhatsApp user
 * - .stalk (reply) → Stalk quoted WhatsApp user
 * - .stalk -g → Stalk current group
 * - .stalk -g <invite_link> → Stalk group by invite link
 * - .stalk -c <channel_link> → Stalk channel by invite link
 * - .stalk -tt <username> → Stalk TikTok profile
 */
let handler = async (m, { conn, text, args, usedPrefix, command }) => {
    try {
        const f = args[0]?.toLowerCase();

        // Parse WhatsApp input
        const inp =
            m.mentionedJid?.[0] ||
            m.quoted?.sender ||
            (text && /^\d+$/.test(text) ? text + "@s.whatsapp.net" : null);

        // Validate input
        if (f !== "-g" && f !== "-c" && f !== "-tt" && f !== "-ig" && !inp) {
            return m.reply(
                `*Universal Stalker*\n\n` +
                `*WhatsApp:*\n` +
                `│ • ${usedPrefix + command} 628123456789\n` +
                `│ • ${usedPrefix + command} @mention\n` +
                `│ • ${usedPrefix + command} (reply to message)\n` +
                `│ • ${usedPrefix + command} -g (current group)\n` +
                `│ • ${usedPrefix + command} -g <invite_link>\n` +
                `│ • ${usedPrefix + command} -c <channel_link>\n\n` +
                `*TikTok:*\n` +
                `│ • ${usedPrefix + command} -tt <username>\n\n` +
                `*Instagram:*\n` +
                `│ • ${usedPrefix + command} -ig <username>`
            );
        }

        // Show loading after validation
        await global.loading(m, conn);

        // Route to appropriate handler
        if (f === "-g") {
            return await grpinfo(m, conn, args.slice(1).join(" "));
        }

        if (f === "-c") {
            return await chinfo(m, conn, args.slice(1).join(" "));
        }

        if (f === "-tt") {
            const username = args.slice(1).join(" ").trim();
            if (!username) {
                return m.reply(`Please provide a TikTok username.\n\nExample: ${usedPrefix + command} -tt godonggedangtuo`);
            }
            return await tiktokStalk(m, conn, username);
        }

        if (f === "-ig") {
             const username = args.slice(1).join(" ").trim();
             if (!username) {
                 return m.reply(
                     `Masukin username IG\n\nContoh:\n${usedPrefix + command} -ig darrma23`
                 );
             }
             return await igStalk(m, conn, username);
         }

        // Default: WhatsApp user info
        await usrinfo(m, conn, inp);

        /**
         * Handles WhatsApp user/business profile information
         * @async
         * @function usrinfo
         */
        async function usrinfo(m, conn, inp) {
            const lid = inp.endsWith("@lid")
                ? inp
                : await conn.signalRepository.lidMapping.getLIDForPN(inp);

            if (!lid) return m.reply("Cannot resolve LID for this user.");

            const jid = await conn.signalRepository.lidMapping.getPNForLID(lid);
            if (!jid) return m.reply("Cannot resolve JID for this user.");

            const [ex] = await conn.onWhatsApp(jid);
            if (!ex?.exists) {
                return m.reply("This number is not registered on WhatsApp.");
            }

            const pp =
                (await conn.profilePictureUrl(jid, "image").catch(() => null)) ||
                "https://qu.ax/jVZhH.jpg";

            const stsRes = await conn.fetchStatus(jid).catch(() => null);
            const sts = stsRes?.[0]?.status;
            const bio = sts?.status?.trim() || null;
            const setAt = sts?.setAt ? new Date(sts.setAt) : null;

            const bis = await conn.getBusinessProfile(jid).catch(() => null);
            const isBiz = bis && (bis.description || bis.category);

            const decodedJid = conn.decodeJid?.(jid) || jid.replace(/:0$/, "");

            let cap = isBiz
                ? "*WhatsApp Business Profile*\n\n"
                : "*WhatsApp User Profile*\n\n";

            cap += `┌─ 「 *USER INFO* 」\n`;
            cap += `│ ◈ *User:* @${lid.split("@")[0]}\n`;
            cap += `│ ◈ *LID:* \`${lid}\`\n`;
            cap += `│ ◈ *JID:* \`${decodedJid}\`\n`;

            if (bio) {
                cap += `│ ◈ *Status:* ${bio}\n`;
                if (setAt) cap += `│ ◈ *Updated:* ${fmttime(setAt)}\n`;
            } else {
                cap += `│ ◈ *Status:* _Not set_\n`;
            }
            cap += `└────────────\n`;

            if (isBiz) {
                cap += `\n┌─ 「 *BUSINESS INFO* 」\n`;

                if (bis.description) {
                    cap += `│ ◈ *Description:* ${bis.description}\n`;
                }

                if (bis.category) {
                    const cat = Array.isArray(bis.category)
                        ? bis.category.join(", ")
                        : bis.category;
                    cap += `│ ◈ *Category:* ${cat}\n`;
                }

                if (bis.email) {
                    cap += `│ ◈ *Email:* ${bis.email}\n`;
                }

                if (bis.website?.length) {
                    cap += `│ ◈ *Website:*\n`;
                    bis.website.forEach((url) => {
                        cap += `│   • ${url}\n`;
                    });
                }

                if (bis.address) {
                    cap += `│ ◈ *Address:* ${bis.address}\n`;
                }

                cap += `└────────────\n`;

                if (bis.business_hours?.business_config?.length) {
                    cap += `\n┌─ 「 *BUSINESS HOURS* 」\n`;
                    cap += `│ ◈ *Timezone:* ${bis.business_hours.timezone || "UTC"}\n`;
                    cap += `│\n`;
                    cap += fmtbizhours(bis.business_hours.business_config);
                    cap += `└────────────\n`;
                }
            }

            await conn.sendMessage(
                m.chat,
                {
                    image: { url: pp },
                    caption: cap.trim(),
                    mentions: [lid],
                },
                { quoted: m }
            );
        }

        /**
         * Handles WhatsApp group information display
         * @async
         * @function grpinfo
         */
        async function grpinfo(m, conn, arg) {
            let meta;
            let gid;

            if (arg && arg.includes("chat.whatsapp.com/")) {
                const match = arg.match(/chat\.whatsapp\.com\/([A-Za-z0-9]+)/);
                if (!match) return m.reply("Invalid group invite link.");

                const invCode = match[1];
                try {
                    meta = await conn.groupGetInviteInfo(invCode);
                    gid = meta.id;
                } catch (e) {
                    return m.reply(`Failed to fetch group info: ${e.message}`);
                }
            } else {
                if (!m.isGroup) {
                    return m.reply(
                        "This command must be used in a group or with an invite link."
                    );
                }

                gid = m.chat;

                try {
                    const chatData = await conn.getChat(gid);
                    if (chatData?.metadata?.participants?.length) {
                        meta = chatData.metadata;
                    }
                } catch {
                    //
                }

                if (!meta) {
                    try {
                        meta = await conn.groupMetadata(gid);

                        try {
                            const chatData = (await conn.getChat(gid)) || { id: gid };
                            chatData.metadata = meta;
                            chatData.subject = meta.subject;
                            chatData.isChats = true;
                            chatData.lastSync = Date.now();
                            await conn.setChat(gid, chatData);
                        } catch {
                            //
                        }
                    } catch (e) {
                        return m.reply(`Failed to fetch group info: ${e.message}`);
                    }
                }
            }

            const mem = meta.participants || [];
            const adm = mem.filter((p) => p.admin);
            const own =
                meta.subjectOwner ||
                adm.find((p) => p.admin === "superadmin")?.id ||
                gid.split("-")[0] + "@s.whatsapp.net";

            const admList =
                adm.length > 0
                    ? adm
                          .map(
                              (v, i) =>
                                  `│ ${i + 1}. @${(v.id || v.phoneNumber).split("@")[0]}`
                          )
                          .join("\n")
                    : "│ _No administrators_";

            const ephTime =
                {
                    86400: "24 hours",
                    604800: "7 days",
                    2592000: "30 days",
                    7776000: "90 days",
                }[meta.ephemeralDuration] || "Disabled";

            const desc = meta.desc || "_No description_";

            let pp = null;
            try {
                pp = await conn.profilePictureUrl(gid, "image");
            } catch {
                //
            }

            const men = [...new Set([...adm.map((v) => v.id || v.phoneNumber), own])];

            const fmtval = (val) => {
                if (
                    !val ||
                    val === "undefined" ||
                    val === "null" ||
                    val === "None" ||
                    val === "Unknown" ||
                    val === ""
                ) {
                    return "_Not available_";
                }
                return val;
            };

            const cap = `
*Group Information*

┌─ 「 *GROUP INFO* 」
│ ◈ *ID:* \`${fmtval(meta.id)}\`
│ ◈ *Mode:* ${fmtval(meta.addressingMode)}
│ ◈ *Name:* ${fmtval(meta.subject)}
│ ◈ *Owner:* ${meta.subjectOwner ? `@${meta.subjectOwner.split("@")[0]}` : "_Not available_"}
│ ◈ *Updated:* ${meta.subjectTime ? fmttime(new Date(meta.subjectTime * 1000)) : "_Not available_"}
│ ◈ *Members:* ${fmtval(meta.size || mem.length)}
│ ◈ *Created:* ${meta.creation ? fmttime(new Date(meta.creation * 1000)) : "_Not available_"}
│ ◈ *Parent:* ${fmtval(meta.linkedParent)}
└────────────

┌─ 「 *ADMINISTRATORS* 」
${admList}
└────────────

┌─ 「 *DESCRIPTION* 」
│ ${desc.split("\n").join("\n│ ")}
└────────────

┌─ 「 *GROUP SETTINGS* 」
│ ◈ *Restrict:* ${meta.restrict ? "Enabled" : "Disabled"}
│ ◈ *Announce:* ${meta.announce ? "Only admins" : "All members"}
│ ◈ *Community:* ${meta.isCommunity ? "Yes" : "No"}
│ ◈ *Community Announce:* ${meta.isCommunityAnnounce ? "Enabled" : "Disabled"}
│ ◈ *Join Approval:* ${meta.joinApprovalMode ? "Required" : "Not required"}
│ ◈ *Member Add:* ${meta.memberAddMode ? "Admins only" : "All admins"}
│ ◈ *Ephemeral:* ${ephTime}
└────────────
`.trim();

            if (pp) {
                await conn.sendMessage(
                    m.chat,
                    {
                        image: { url: pp },
                        caption: cap,
                        mentions: men,
                    },
                    { quoted: m }
                );
            } else {
                await conn.sendMessage(
                    m.chat,
                    {
                        text: cap,
                        mentions: men,
                    },
                    { quoted: m }
                );
            }
        }

        /**
         * Handles WhatsApp channel information display
         * @async
         * @function chinfo
         */
        async function chinfo(m, conn, arg) {
            if (!arg || !arg.includes("whatsapp.com/channel/")) {
                return m.reply("Please provide a valid WhatsApp channel invite link.");
            }

            const match = arg.match(/channel\/([A-Za-z0-9]+)/);
            if (!match) return m.reply("Invalid channel invite link.");

            const invCode = match[1];

            let meta;
            try {
                meta = await conn.newsletterMetadata("invite", invCode, "GUEST");
            } catch (e) {
                return m.reply(`Failed to fetch channel info: ${e.message}`);
            }

            const cid = meta.id;
            const stt = meta.state?.type || "UNKNOWN";
            const trd = meta.thread_metadata || {};
            const nam = trd.name?.text || "_Not set_";
            const desc = trd.description?.text || "_No description_";
            const hdl = trd.handle || "_Not set_";
            const sub = trd.subscribers_count || "0";
            const ver = trd.verification || "UNVERIFIED";
            const rct = trd.settings?.reaction_codes?.value || "UNKNOWN";
            const inv = trd.invite || invCode;

            const fmtval = (val) => {
                if (
                    !val ||
                    val === "undefined" ||
                    val === "null" ||
                    val === "None" ||
                    val === "Unknown" ||
                    val === ""
                ) {
                    return "_Not available_";
                }
                return val;
            };

            const fmtsub = (count) => {
                const num = parseInt(count) || 0;
                if (num >= 1000000) {
                    return (num / 1000000).toFixed(1) + "M";
                } else if (num >= 1000) {
                    return (num / 1000).toFixed(1) + "K";
                }
                return num.toString();
            };

            let pp = null;
            if (trd.preview?.direct_path) {
                pp = `https://mmg.whatsapp.net${trd.preview.direct_path}`;
            }

            const crDate =
                trd.creation_time && !isNaN(parseInt(trd.creation_time))
                    ? fmttime(new Date(parseInt(trd.creation_time) * 1000))
                    : "_Not available_";

            const cap = `
*Channel Information*

┌─ 「 *CHANNEL INFO* 」
│ ◈ *ID:* \`${fmtval(cid)}\`
│ ◈ *Status:* ${fmtval(stt)}
│ ◈ *Name:* ${fmtval(nam)}
│ ◈ *Handle:* ${fmtval(hdl)}
│ ◈ *Invite:* \`${fmtval(inv)}\`
│ ◈ *Subscribers:* ${fmtsub(sub)}
│ ◈ *Verification:* ${fmtval(ver)}
│ ◈ *Created:* ${crDate}
│ ◈ *Picture:* ${trd.preview?.direct_path ? "Available" : "Not available"}
└────────────

┌─ 「 *DESCRIPTION* 」
│ ${desc.split("\n").join("\n│ ")}
└────────────

┌─ 「 *METADATA* 」
│ ◈ *Description ID:* \`${fmtval(trd.description?.id)}\`
│ ◈ *Name ID:* \`${fmtval(trd.name?.id)}\`
│ ◈ *Preview Type:* ${fmtval(trd.preview?.type)}
└────────────

┌─ 「 *SETTINGS* 」
│ ◈ *Reactions:* ${fmtval(rct)}
└────────────

*Invite Link:* https://whatsapp.com/channel/${invCode}
`.trim();

            if (pp) {
                await conn.sendMessage(
                    m.chat,
                    {
                        image: { url: pp },
                        caption: cap,
                    },
                    { quoted: m }
                );
            } else {
                await conn.sendMessage(
                    m.chat,
                    {
                        text: cap,
                    },
                    { quoted: m }
                );
            }
        }

        /**
         * Handles TikTok profile stalking
         * @async
         * @function tiktokStalk
         */
        async function tiktokStalk(m, conn, username) {
            const cleanUsername = username.replace(/^@/, "");

            let data;
            try {
                const res = await fetch(
                    `https://api-faa.my.id/faa/tiktokstalk?username=${encodeURIComponent(cleanUsername)}`
                );

                if (!res.ok) {
                    throw new Error(`API returned ${res.status}: ${res.statusText}`);
                }

                const json = await res.json();

                if (!json.status || !json.result) {
                    throw new Error("Invalid API response");
                }

                data = json.result;
            } catch (e) {
                return m.reply(`Failed to fetch TikTok profile: ${e.message}`);
            }

            const fmtNum = (num) => {
                const n = parseInt(num) || 0;
                if (n >= 1000000000) return (n / 1000000000).toFixed(1) + "B";
                if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
                if (n >= 1000) return (n / 1000).toFixed(1) + "K";
                return n.toString();
            };

            const fmtDate = (timestamp) => {
                if (!timestamp) return "_Not available_";
                const date = new Date(parseInt(timestamp) * 1000);
                if (isNaN(date.getTime())) return "_Invalid date_";

                return new Intl.DateTimeFormat("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    timeZone: "UTC",
                }).format(date);
            };

            const cap = `
*TikTok Profile Information*

┌─ 「 *PROFILE INFO* 」
│ ◈ *Username:* @${data.username || cleanUsername}
│ ◈ *Name:* ${data.name || "_Not set_"}
│ ◈ *ID:* \`${data.id || "_Not available_"}\`
│ ◈ *Region:* ${data.region?.toUpperCase() || "_Not set_"}
│ ◈ *Verified:* ${data.verified ? "Yes" : "No"}
│ ◈ *Private:* ${data.private ? "Yes" : "Public"}
│ ◈ *Seller:* ${data.seller ? "Yes" : "No"}
│ ◈ *Organization:* ${data.organization ? "Yes" : "Personal"}
│ ◈ *Created:* ${fmtDate(data.create_time)}
└────────────

┌─ 「 *BIO* 」
│ ${data.bio ? data.bio.split("\n").join("\n│ ") : "_No bio_"}
└────────────

┌─ 「 *STATISTICS* 」
│ ◈ *Followers:* ${fmtNum(data.stats?.followers || 0)}
│ ◈ *Following:* ${fmtNum(data.stats?.following || 0)}
│ ◈ *Likes:* ${fmtNum(data.stats?.likes || 0)}
│ ◈ *Videos:* ${fmtNum(data.stats?.videos || 0)}
│ ◈ *Friends:* ${fmtNum(data.stats?.friend || 0)}
└────────────

┌─ 「 *ENGAGEMENT* 」
│ ◈ *Recent Views:* ${fmtNum(data.recent_view || 0)}
│ ◈ *New Followers:* ${fmtNum(data.new_followers || 0)}
│ ◈ *Story:* ${data.story ? "Available" : "None"}
└────────────

*Profile Link:* ${data.link || `https://www.tiktok.com/@${cleanUsername}`}
`.trim();

            if (data.avatar) {
                await conn.sendMessage(
                    m.chat,
                    {
                        image: { url: data.avatar },
                        caption: cap,
                    },
                    { quoted: m }
                );
            } else {
                await conn.sendMessage(
                    m.chat,
                    {
                        text: cap,
                    },
                    { quoted: m }
                );
            }
        }

 async function igStalk(m, conn, username) {
    try {
        const uname = username.replace(/^@/, "").trim();

        const { data } = await axios.get(
            `https://dumpor.com/v/${uname}`,
            {
                headers: {
                    "user-agent":
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
                    "accept":
                        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
                    // cookie penting, dumpor tanpa ini sering ngasih HTML setengah mati
                    "cookie":
                        "_inst_key=SFMyNTY.g3QAAAABbQAAAAtfY3NyZl90b2tlbm0AAAAYT3dzSXI2YWR6SG1fNFdmTllfZnFIZ1Ra"
                },
            }
        );

        const $ = cheerio.load(data);

        // ========= BASIC INFO =========
        const igUsername =
            (
                $('#user-page h4').first().text() ||
                uname
            )
                .replace(/@/g, "")
                .trim();

        const fullName =
            $('#user-page h1').first().text().trim() || "-";

        const profilePic =
            ($('#user-page .user__img').attr("style") || "")
                .replace(/(background-image:\s*url\(|\)|'|")/g, "")
                .trim();

        const bio =
            $(".user__info-desc").text().trim() || "_No bio_";

        // ========= STATS =========
        let posts = "-";
        let followers = "-";
        let following = "-";

        // layout utama
        const stats = $("#user-page ul li");

        if (stats.length >= 3) {
            posts = stats.eq(0).text().replace(/Posts?/i, "").trim();
            followers = stats.eq(1).text().replace(/Followers?/i, "").trim();
            following = stats.eq(2).text().replace(/Following/i, "").trim();
        }

        // fallback layout (akun gede / beda view)
        if (
            followers === "-" ||
            followers === "" ||
            followers === "0"
        ) {
            const alt = $("#user-page .container a");
            if (alt.length >= 4) {
                posts =
                    alt.eq(0).text().replace(/Posts?/i, "").trim() || posts;
                followers =
                    alt.eq(2).text().replace(/Followers?/i, "").trim() || followers;
                following =
                    alt.eq(3).text().replace(/Following/i, "").trim() || following;
            }
        }

        const caption = `
*Instagram Profile*

┌─ 「 *PROFILE INFO* 」
│ ◈ *Username:* @${igUsername}
│ ◈ *Name:* ${fullName}
│ ◈ *Posts:* ${posts || "-"}
│ ◈ *Followers:* ${followers || "-"}
│ ◈ *Following:* ${following || "-"}
└────────────

┌─ 「 *BIO* 」
│ ${bio.split("\n").join("\n│ ")}
└────────────

*Profile Link:* https://instagram.com/${igUsername}
`.trim();

        if (profilePic) {
            await conn.sendMessage(
                m.chat,
                {
                    image: { url: profilePic },
                    caption,
                },
                { quoted: m }
            );
        } else {
            await conn.sendMessage(
                m.chat,
                { text: caption },
                { quoted: m }
            );
        }
    } catch (e) {
        console.error(e);
        m.reply("Instagram profile tidak ditemukan atau Dumpor lagi rusak.");
    }
}

        /**
         * Formats date to readable string
         * @function fmttime
         */
        function fmttime(d) {
            if (!(d instanceof Date) || isNaN(d.getTime())) {
                return "_Invalid date_";
            }

            return (
                new Intl.DateTimeFormat("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false,
                    timeZone: "Asia/Jakarta",
                }).format(d) + " WIB"
            );
        }

        /**
         * Formats business hours configuration
         * @function fmtbizhours
         */
        function fmtbizhours(cfg) {
            if (!Array.isArray(cfg) || cfg.length === 0) {
                return "│ ◈ _No business hours configured_\n";
            }

            const dayOrd = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
            const dayMap = {
                sun: "Sunday",
                mon: "Monday",
                tue: "Tuesday",
                wed: "Wednesday",
                thu: "Thursday",
                fri: "Friday",
                sat: "Saturday",
            };

            const cfgMap = {};
            cfg.forEach((c) => {
                cfgMap[c.day_of_week] = c;
            });

            let res = "";
            dayOrd.forEach((day) => {
                const dayNam = dayMap[day];
                const c = cfgMap[day];

                if (c) {
                    if (c.mode === "open_24h") {
                        res += `│ ◈ *${dayNam}:* Open 24 Hours\n`;
                    } else if (c.mode === "specific_hours") {
                        const opn = mintotime(c.open_time);
                        const cls = mintotime(c.close_time);
                        res += `│ ◈ *${dayNam}:* ${opn} - ${cls}\n`;
                    } else {
                        res += `│ ◈ *${dayNam}:* _Closed_\n`;
                    }
                } else {
                    res += `│ ◈ *${dayNam}:* _Closed_\n`;
                }
            });

            return res;
        }

        /**
         * Converts minutes to time string
         * @function mintotime
         */
        function mintotime(min) {
            const m = typeof min === "string" ? parseInt(min, 10) : min;

            if (isNaN(m) || m < 0) {
                return "00:00";
            }

            const h = Math.floor(m / 60);
            const n = m % 60;
            return `${String(h).padStart(2, "0")}:${String(n).padStart(2, "0")}`;
        }
   
        function parseIGNumber(txt = "") {
          txt = txt.toLowerCase().replace(/,/g, "").trim()
      
          const m = txt.match(/([\d.]+)\s*([mk]?)/i)
          if (!m) return "?"
      
          let num = parseFloat(m[1])
          const unit = m[2]
      
          if (unit === "k") num *= 1_000
          if (unit === "m") num *= 1_000_000
      
          return Math.round(num).toLocaleString("en-US")
      }
    } catch (e) {
        global.logger.error(e);
        m.reply(`Error: ${e.message}`);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["stalk"];
handler.tags = ["tools"];
handler.command = /^(stalk)$/i;

handler.desc = [
  "Universal stalker untuk WhatsApp dan TikTok",
  "Mendukung stalk user WhatsApp via nomor, mention, atau reply",
  "Mendeteksi dan menampilkan profil WhatsApp Business",
  "Menampilkan metadata grup WhatsApp lengkap dengan admin",
  "Mendukung stalk grup via invite link",
  "Mendukung stalk channel WhatsApp via invite link",
  "Mendukung stalk profil TikTok beserta statistiknya",
  "Menampilkan foto profil jika tersedia",
  "Auto-detect tipe input dan mode stalk"
];

export default handler;