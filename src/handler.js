import { smsg } from "#core/smsg.js";
import { join, dirname } from "node:path";
import { getRoleByLevel } from "#db";
import { createClient } from "redis";

const CMD_PREFIX_RE = /^[/!.]/;

const normalizeJid = (jid = "") =>
	String(jid)
		.split("@")[0]
		.split(":")[0];

const safe = async (fn, fallback = undefined) => {
	try {
		return await fn();
	} catch {
		return fallback;
	}
};

const parsePrefix = (connPrefix, pluginPrefix) => {
	if (pluginPrefix) return pluginPrefix;
	if (connPrefix) return connPrefix;
	return CMD_PREFIX_RE;
};

const matchPrefix = (prefix, text) => {
	if (prefix instanceof RegExp) {
		return [[prefix.exec(text), prefix]];
	}

	if (Array.isArray(prefix)) {
		return prefix.map(p => {
			const re =
				p instanceof RegExp
					? p
					: new RegExp(
							p.replace(/[|\{}()[\]^$+*?.]/g, "\\$&")
					  );
			return [re.exec(text), re];
		});
	}

	if (typeof prefix === "string") {
		const escaped = prefix.replace(/[^a-zA-Z0-9_-]/g, "\\$&");
		const regex = new RegExp(`^${escaped}`, "i");
		return [[regex.exec(text), regex]];
	}

	return [[[], new RegExp()]];
};

const isCmdMatch = (cmd, rule) => {
	if (rule instanceof RegExp) return rule.test(cmd);
	if (Array.isArray(rule)) {
		return rule.some(r =>
			r instanceof RegExp ? r.test(cmd) : r === cmd
		);
	}
	if (typeof rule === "string") return rule === cmd;
	return false;
};

const resolveLid = async (sender, conn) => {
	if (!sender || typeof sender !== "string") return sender || "";

	if (sender.endsWith("@lid")) {
		return sender.split("@")[0];
	}

	if (sender.endsWith("@s.whatsapp.net")) {
		const resolved =
			await conn.signalRepository.lidMapping.getLIDForPN(sender);
		if (resolved) {
			return typeof resolved === "string" &&
				resolved.endsWith("@lid")
				? resolved.split("@")[0]
				: resolved;
		}
	}

	return sender.split("@")[0];
};

const getGroupMetadata = async (conn, chat) => {
	return await safe(
		() => conn.groupMetadata(chat),
		{}
	);
};

const checkPermissions = (
	m,
	settings,
	isOwner,
	isAdmin,
	isBotAdmin,
	chat
) => {
	if (!m.fromMe && settings?.self && !isOwner)
		return { allowed: false, reason: "self" };

	if (settings?.gconly && !m.isGroup && !isOwner)
		return { allowed: false, reason: "gconly" };

	if (!isAdmin && !isOwner && chat?.adminOnly)
		return { allowed: false, reason: "adminOnly" };

	if (!isOwner && chat?.mute)
		return { allowed: false, reason: "mute" };

	return { allowed: true };
};

async function printMessage(
	m,
	conn = {
		user: {},
		decodeJid: id => id,
		getName: async () => "Unknown",
		logger: console,
	}
) {
	try {
		if (global.db?.data?.settings?.[conn.user?.lid]?.noprint) return;
		if (!m || !m.sender || !m.chat || !m.mtype) return;

		const sender = conn.decodeJid(m.sender);
		const chat = conn.decodeJid(m.chat);
		const user = (await conn.getName(sender)) || "Unknown";

		const rawText = m.text?.trim() || "";
		const prefixMatch = rawText.match(/^([/!.])\s*(\S+)/);
		const prefix = m.prefix || prefixMatch?.[1];
		const command = m.command || prefixMatch?.[2];

		if (!prefix || !command) return;

		global.logger.info(
			{ user, sender, chat },
			`${prefix}${command} executed`
		);
	} catch (e) {
		global.logger.error(e);
	}
}

const expToLevel = level => 100 + level * 50;

const clockString = ms => {
	const h = Math.floor(ms / 3600000);
	const m = Math.floor(ms / 60000) % 60;
	const s = Math.floor(ms / 1000) % 60;
	return [h, m, s].map(v => v.toString().padStart(2, "0")).join(":");
};

const resolveHelper = {
	sender(m, store = {}) {
		const gm = m.isGroup ? store.groupMetadata : null;
		const jid = m.sender;
		const participant = gm?.participants?.find(
		   p =>
	      normalizeJid(p.id || p.jid || "") ===
	      normalizeJid(jid)
	      );

		return {
			pushName: m.pushName || "-",
			lid: jid,
			pn: participant?.phoneNumber || m.chat,
			isAdmin: !!participant?.admin,
			device: m.key?.id ? m.key.id.slice(0, 2) : "-",
		};
	},
};

/* ================= REDIS REPORT LISTENER ================= */

const TYPE_META = {
  error:   { emoji: "🔴", label: "Error Command" },
  request: { emoji: "🟢", label: "Request Fitur" },
  blocked: { emoji: "🟠", label: "Unblock Request" },
  other:   { emoji: "🔵", label: "Laporan Lainnya" }
};

let redisClient = null;
let redisSubscriber = null;

async function initRedisReportListener() {
  if (redisClient) return;

  try {
    redisClient = createClient({
      url: "redis://127.0.0.1:6379"
    });

    redisClient.on("error", err =>
      console.error("Redis Bot Error:", err.message)
    );

    await redisClient.connect();
    console.log("🟥 Bot Redis connected");

    redisSubscriber = redisClient.duplicate();
    await redisSubscriber.connect();

    await redisSubscriber.subscribe("reports", async (msg) => {
      console.log("📨 Redis msg:", msg);

      let data;
      try {
        data = JSON.parse(msg);
      } catch {
        return console.log("⚠ Invalid JSON:", msg);
      }

      const meta = TYPE_META[data.type] || TYPE_META.other;
      const time = new Date(data.timestamp || Date.now())
        .toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });

      const text = `*🚨 REPORT LIBIE API*

> Type : ${meta.emoji} ${meta.label}
> IP   : ${data.ip || "-"}
> Time : ${time}

Pesan:
_*${data.message || "-"}*_`;

      const ownerJid = "6289521010900@s.whatsapp.net";

      try {
        if (global.conn?.user?.id) {  // ✅ Cek connection
          await global.conn.sendMessage(ownerJid, { text });
          console.log("✅ Sent →", ownerJid);
        }
      } catch (err) {
        console.log("❌ Gagal →", ownerJid, err.message);
      }
    });
  } catch (err) {
    console.error("Redis init error:", err.message);
    redisClient = null;
    redisSubscriber = null;
  }
}

export async function handler(chatUpdate) {
	try {
		if (!chatUpdate) return;

      this.pushMessage(chatUpdate.messages);
      
		const messages = chatUpdate.messages;
		if (!messages?.length) return;

		const m = smsg(this, messages[messages.length - 1]);
		if (!m || m.isBaileys) return;
        
        // Biar ga respon chat bot
        if (m.fromMe) return;
		
		if (m.chat) {
        const isGroup = m.chat.endsWith("@g.us") ? 1 : 0
      
      if (!global.db.data.chats[m.chat]) {
         global.db.data.chats[m.chat] = {}
         }
         
        global.db.data.chats[m.chat].isGroup = isGroup
        global.db.data.chats[m.chat].lastActivity = Date.now()
      
        if (isGroup && (m.chatName || m.pushName)) {
          global.db.data.chats[m.chat].name = m.chatName || "Group"
        }
      }

		const rpg = global.rpg?.data?.user?.[m.sender];
		
		if (
        m.isGroup &&
        typeof m.text === 'string' &&
        !CMD_PREFIX_RE.test(m.text.trim())
      ) {
        if (rpg) {
          rpg.lastgc = Date.now()
        }
      }

		if (rpg && !rpg?.name && (m.pushName || m.name)) {
			rpg.name = m.pushName || m.name;
		}

		if (rpg && m.text && !m.isCommand) {
			const gain = Math.floor(Math.random() * 10) + 1;
			rpg.exp += gain;

			while (rpg.exp >= expToLevel(rpg.level)) {
				rpg.exp -= expToLevel(rpg.level);
				rpg.level += 1;
			}

			const newRole = getRoleByLevel(rpg.level);
			const isChannel = m.chat?.endsWith("@newsletter");
			if (rpg.role !== newRole) {
				rpg.role = newRole;
				if (!isChannel) {
             await m.reply(`🎖️ Role naik: *${newRole}*`);
           }
			}
		}

		const settings =
			global.db?.data?.settings?.[this.user.lid] || {};

		const senderLid = await resolveLid(m.sender, this);
		const mainOwners = (global.config.owner || []).map(o => o.toString().split("@")[0]);
      
      let isRowner = false;
      let isOwner = false;
      
      if (this.isJadiBot) {
        isRowner = mainOwners.includes(senderLid);
        isOwner =
          m.fromMe ||
          senderLid === this.ownerLid;
      } else {
        isRowner =
          m.fromMe ||
          mainOwners.includes(senderLid);
        isOwner = isRowner;
      }

		const isPremium =
			isOwner ||
			(rpg?.premium === 1 &&
				(rpg?.premiumTime === 0 ||
					rpg?.premiumTime > Date.now()));

		let groupMetadata = {};
		let participants = [];
		let participantMap = {};
		let user = {};
		let bot = {};
		let isRAdmin = false;
		let isAdmin = false;
		let isBotAdmin = false;

		if (m.isGroup) {
        groupMetadata = await getGroupMetadata(this, m.chat);
        participants = groupMetadata?.participants || [];
        participantMap = Object.fromEntries(
           participants.map(p => [
             normalizeJid(
               this.decodeJid(p.id || p.jid || "")
             ),
             p
           ])
         );
      
        // ================= USER =================
        user =
           participantMap[
             normalizeJid(
               this.decodeJid(m.sender)
             )
           ] || {};
         
         isRAdmin = user?.admin === "superadmin";
         isAdmin = isRAdmin || user?.admin === "admin";
         
         // ================= BOT =================
         bot =
           participantMap[
             normalizeJid(
               this.decodeJid(
                 this.user.lid || this.user.id
               )
             )
           ] || {};
         
         isBotAdmin =
           ["admin", "superadmin"].includes(bot?.admin);
         
         // ================= DEBUG SAFETY =================
         if (participants.length === 0) {
           console.warn("⚠️ Participants kosong:", m.chat);
         }
         
         if (participants.length > 0 && !bot?.id) {
         console.warn("⚠️ Bot tidak ditemukan di participants", {
           chat: m.chat,
           botId: this.decodeJid(
             this.user.lid || this.user.id
           )
         });
         }
      }

		const __dirname = dirname(
			Bun.fileURLToPath(import.meta.url)
		);
		const pluginDir = join(__dirname, "./plugins");

		let commandMatched = false;
		let matchedKey = null;

		for (const name in global.plugins) {
			const plugin = global.plugins[name];
			if (!plugin || plugin.disabled) continue;

			const __filename = join(pluginDir, name);

			if (typeof plugin.all === "function") {
				await safe(() =>
					plugin.all.call(this, m, {
						chatUpdate,
						__dirname: pluginDir,
						__filename,
					})
				);
			}

			if (typeof plugin.before === "function") {
				const res = await safe(() =>
					plugin.before.call(this, m, {
						conn: this,
						chatUpdate,
						__dirname: pluginDir,
						__filename,
					})
				);
				if (res === false) return;
			}

			if (typeof plugin !== "function") continue;

			const prefix = parsePrefix(
				this.prefix,
				plugin.customPrefix
			);

			const body = typeof m.text === "string" ? m.text : "";
			const match = matchPrefix(prefix, body).find(p => p[0]);
			let usedPrefix;

			if ((usedPrefix = match?.[0]?.[0])) {
				const noPrefix = body.replace(usedPrefix, "");
				const parts = noPrefix.trim().split(/\s+/);
				const [rawCmd, ...argsArr] = parts;

				const command = (rawCmd || "").toLowerCase();
				const text = parts.slice(1).join(" ");

				if (!isCmdMatch(command, plugin.command)) continue;
				m.plugin = name;
				if (
				  (argsArr[0] === '-h' || argsArr[0] === '--help') &&
				  Array.isArray(plugin.desc)
				) {
				  let text = ''
                  text += `📌 *Command Info*\n`
                  text += `*Command:* \`${usedPrefix + command}\`\n`
                  text += `*Kategori:* \`${(plugin.tags || []).join(', ')}\`\n`
                  text += `*Lokasi:* \`src/plugins/${m.plugin}\`\n\n`
                  text += `*Deskripsi:*\n`
                  text += plugin.desc.map(v => `- ${v}`).join('\n')
                  
                  await m.reply(text)
				   commandMatched = true;
				  break;
				}

				commandMatched = true;
				matchedKey = m.key;
				m.plugin = name;

				const chat =
					global.db?.data?.chats?.[m.chat] || {};

				const permission = checkPermissions(
					m,
					settings,
					isOwner,
					isAdmin,
					isBotAdmin,
					chat
				);

				if (!permission.allowed) break;

				const fail = plugin.fail || global.dfail;

				if (plugin.rowner && !isRowner) {
              fail("rowner", m, this);
              continue;
            }

            if (plugin.owner && !isOwner) {
					fail("owner", m, this);
					continue;
				}

				if (plugin.group && !m.isGroup) {
					fail("group", m, this);
					continue;
				}

				if (plugin.botAdmin && !isBotAdmin) {
					fail("botAdmin", m, this);
					continue;
				}

				if (plugin.admin && !isAdmin) {
					fail("admin", m, this);
					continue;
				}

				if (plugin.register && !rpg?.registered) {
					return global.dfail("register", m, this);
				}

				if (plugin.level && (rpg?.level || 0) < plugin.level) {
					await m.reply(
						`Butuh level ${plugin.level}.\nLevel kamu ${rpg?.level || 0}`
					);
					continue;
				}

				let cost = 0;
				if (plugin.limit === true) cost = 1;
				else if (Number.isInteger(plugin.limit))
					cost = plugin.limit;

				if (cost > 0 && !isPremium) {
					if ((rpg?.user_limit || 0) < cost) {
						return global.dfail("limit", m, this);
					}
				}

				const extra = {
					match,
					usedPrefix,
					noPrefix,
					args: argsArr,
					command,
					text,
					conn: this,
					resolve: {
						sender: msg =>
							resolveHelper.sender(msg, {
								groupMetadata,
							}),
					},
					participants,
					groupMetadata,
					user,
					bot,
					isRowner,
					isOwner,
					isRAdmin,
					isAdmin,
					isBotAdmin,
					chatUpdate,
					__dirname: pluginDir,
					__filename,
				};

				let success = false;

				try {
					await plugin.call(this, m, extra);
					success = true;
				} catch (e) {
					global.logger.error(e);
					await safe(() =>
						m.reply(`❌ Error: ${e.message}`)
					);
				}

				if (success && rpg) {
				   const stats = global.db.data.stats || (global.db.data.stats = {})

               if (!stats[m.plugin]) {
                 stats[m.plugin] = {
                   total: 0,
                   success: 0,
                   last: 0
                 }
               }
               
               stats[m.plugin].total += 1
               stats[m.plugin].success += 1
               stats[m.plugin].last = Date.now()

					let xp = Number.isInteger(plugin.exp)
						? plugin.exp
						: 17;
					if (xp > 1_000_000) xp = 0;

					rpg.exp += xp;

					while (rpg.exp >= expToLevel(rpg.level)) {
						rpg.exp -= expToLevel(rpg.level);
						rpg.level += 1;
					}

					if (cost > 0) {
						rpg.user_limit -= cost;
						await m.reply(
							`${cost} Limit terpakai`
						);
					}
				}
				break;
			}
		}

		await safe(() => printMessage(m, this));

		if (commandMatched && matchedKey) {
			setImmediate(async () => {
				try {
					await this.readMessages([matchedKey]);
				} catch (e) {
					global.logger?.error(
						{ error: e.message },
						"Read message error"
					);
				}
			});
		}
	} catch (e) {
		global.logger.error(
			{ error: e.message, stack: e.stack },
			"Handler error"
		);
	}
}