/**
 * @file Group management command handler
 * @module plugins/group/group
 * @license Apache-2.0
 * @author Naruya Izumi
 */

const aliases = {
    open: ["open", "o"],
    close: ["close", "c"],
    add: ["add", "a"],
    kick: ["kick", "k"],
    promote: ["promote", "p"],
    demote: ["demote", "d"],
    link: ["link", "l"],
    revoke: ["revoke", "r"]
};

const isCmd = (input, list) => list.includes(input);

const box = (title, content) => `
╭─〔 ${title} 〕
│
${content}
╰────────────
`.trim();

let handler = async (
    m,
    {
        conn,
        args,
        usedPrefix,
        command,
        participants,
        groupMetadata
    }
) => {
    const subcommand = (args[0] || "").toLowerCase();

    const usage = {
        add: `${usedPrefix + command} add 628xxx / @user`,
        kick: `${usedPrefix + command} kick 628xxx / @user`,
        promote: `${usedPrefix + command} promote 628xxx / @user`,
        demote: `${usedPrefix + command} demote 628xxx / @user`
    };

    if (!subcommand) {
        return m.reply(
            box(
                "Group Management",
                `
├ Open / Close
│ • ${usedPrefix + command} open
│ • ${usedPrefix + command} close
│
├ Member Management
│ • ${usedPrefix + command} add @user
│ • ${usedPrefix + command} kick @user
│ • ${usedPrefix + command} promote @user
│ • ${usedPrefix + command} demote @user
│
├ Group Utilities
│ • ${usedPrefix + command} link
│ • ${usedPrefix + command} revoke
│
├ Shortcuts
│ • o = open
│ • c = close
│ • a = add
│ • k = kick
│ • p = promote
│ • d = demote
│ • l = link
│ • r = revoke
│
├ Examples
│ • ${usedPrefix + command} add 6281234567890
│ • ${usedPrefix + command} kick @user
│ • Reply message + ${usedPrefix + command} promote
│
╰─ Note:
   Mention user, input number,
   or reply to message.
`
            )
        );
    }

    const getTargetUser = (arg) => {
        let target =
            m.mentionedJid?.[0] ||
            m.quoted?.sender ||
            null;

        if (!target && arg) {
            const num = arg.replace(/[^0-9]/g, "");

            if (num.length >= 5) {
                const jid = num + "@s.whatsapp.net";

                const lid =
                    conn.signalRepository
                        ?.lidMapping
                        ?.getLIDForPN
                        ?.(jid);

                target = lid || jid;
            }
        }

        if (!target && arg) {
            const raw =
                arg.replace(/[^0-9]/g, "") +
                "@lid";

            if (
                participants?.some(
                    (p) => p.id === raw
                )
            ) {
                target = raw;
            }
        }

        return target;
    };

    const inGroup = (target) =>
        participants?.some(
            (p) => p.id === target
        );

    const sendUsage = (title, text) =>
        m.reply(
            box(
                title,
                `
├ Usage
│ • ${text}
│
╰─ Mention user, input number,
   or reply to message.
`
            )
        );

    try {

        // OPEN
        if (isCmd(subcommand, aliases.open)) {

            await conn.groupSettingUpdate(
                m.chat,
                "not_announcement"
            );

            return m.reply(
                box(
                    "Group Opened",
                    `
├ Status
│ • All members can send messages
│
╰─ Group is now active.
`
                )
            );
        }

        // CLOSE
        if (isCmd(subcommand, aliases.close)) {

            await conn.groupSettingUpdate(
                m.chat,
                "announcement"
            );

            return m.reply(
                box(
                    "Group Closed",
                    `
├ Status
│ • Only admins can send messages
│
╰─ Group has been restricted.
`
                )
            );
        }

        // ADD
        if (isCmd(subcommand, aliases.add)) {

            const target = getTargetUser(args[1]);

            if (!target) {
                return sendUsage(
                    "Add Member",
                    usage.add
                );
            }

            const res =
                await conn.groupParticipantsUpdate(
                    m.chat,
                    [target],
                    "add"
                );

            const user = res?.[0];

            if (user?.status === "200") {

                return conn.sendMessage(
                    m.chat,
                    {
                        text: `
╭─〔 Member Added 〕
│
├ Success
│ • @${target.split("@")[0]}
│
╰─ User added to group.
`.trim(),
                        mentions: [target]
                    },
                    { quoted: m }
                );
            }

            return m.reply(
                box(
                    "Add Failed",
                    `
├ Status
│ • ${user?.status || "Unknown"}
│
╰─ Failed to add user.
`
                )
            );
        }

        // KICK
        if (isCmd(subcommand, aliases.kick)) {

            const target = getTargetUser(args[1]);

            if (!inGroup(target)) {
                return sendUsage(
                    "Remove Member",
                    usage.kick
                );
            }

            await conn.groupParticipantsUpdate(
                m.chat,
                [target],
                "remove"
            );

            return conn.sendMessage(
                m.chat,
                {
                    text: `
╭─〔 Member Removed 〕
│
├ Success
│ • @${target.split("@")[0]}
│
╰─ User removed from group.
`.trim(),
                    mentions: [target]
                },
                { quoted: m }
            );
        }

        // PROMOTE
        if (isCmd(subcommand, aliases.promote)) {

            const target = getTargetUser(args[1]);

            if (!inGroup(target)) {
                return sendUsage(
                    "Promote Member",
                    usage.promote
                );
            }

            await conn.groupParticipantsUpdate(
                m.chat,
                [target],
                "promote"
            );

            return conn.sendMessage(
                m.chat,
                {
                    text: `
╭─〔 Member Promoted 〕
│
├ Success
│ • @${target.split("@")[0]}
│
╰─ User is now admin.
`.trim(),
                    mentions: [target]
                },
                { quoted: m }
            );
        }

        // DEMOTE
        if (isCmd(subcommand, aliases.demote)) {

            const target = getTargetUser(args[1]);

            if (!inGroup(target)) {
                return sendUsage(
                    "Demote Member",
                    usage.demote
                );
            }

            await conn.groupParticipantsUpdate(
                m.chat,
                [target],
                "demote"
            );

            return conn.sendMessage(
                m.chat,
                {
                    text: `
╭─〔 Member Demoted 〕
│
├ Success
│ • @${target.split("@")[0]}
│
╰─ Admin privileges removed.
`.trim(),
                    mentions: [target]
                },
                { quoted: m }
            );
        }

        // LINK
        if (isCmd(subcommand, aliases.link)) {

            const invite =
                await conn.groupInviteCode(
                    m.chat
                );

            const link =
                `https://chat.whatsapp.com/${invite}`;

            await conn.client(
                m.chat,
                {
                    text: `
╭─〔 Group Link 〕
│
├ Group
│ • ${groupMetadata.subject}
│
├ ID
│ • ${m.chat}
│
╰─ Click button below to copy.
`.trim(),

                    title: "Group Link",

                    footer:
                        "WhatsApp Group Invitation",

                    interactiveButtons: [
                        {
                            name: "cta_copy",

                            buttonParamsJson:
                                JSON.stringify({
                                    display_text:
                                        "Copy Link",

                                    copy_code:
                                        link
                                })
                        }
                    ]
                }
            );

            return;
        }

        // REVOKE
        if (isCmd(subcommand, aliases.revoke)) {

            await conn.groupRevokeInvite(
                m.chat
            );

            return m.reply(
                box(
                    "Invite Revoked",
                    `
├ Success
│ • Group invite link reset
│
╰─ Previous link is invalid now.
`
                )
            );
        }

        // INVALID
        return m.reply(
            box(
                "Invalid Subcommand",
                `
├ Available Commands
│ • open / o
│ • close / c
│ • add / a
│ • kick / k
│ • promote / p
│ • demote / d
│ • link / l
│ • revoke / r
│
╰─ Use ${usedPrefix + command} for help.
`
            )
        );

    } catch (e) {

        console.error(e);

        return m.reply(
            box(
                "Error",
                `
├ Message
│ • ${e.message}
│
╰─ Something went wrong.
`
            )
        );
    }
};

handler.help = ["group"];
handler.tags = ["group"];
handler.command = /^(g|group)$/i;

handler.group = true;
handler.admin = true;
handler.botAdmin = true;

export default handler;