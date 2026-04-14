/**
 * @file Owner/creator information command handler
 * @module plugins/info/owner
 * @license Apache-2.0
 * @author Himejima
 */

/**
 * Displays owner/creator contact information as a vCard
 * @async
 * @function handler
 * @param {Object} m - Message object
 * @param {Object} conn - Connection object
 * @returns {Promise<void>}
 *
 * @description
 * Command to display the bot owner's contact information in vCard format.
 * Includes personal details, contact information, and social media links.
 *
 * @features
 * - Displays owner contact information as vCard
 * - Includes WhatsApp business profile details
 * - Shows social media links (Instagram)
 * - Contact address and business hours
 * - External advertisement integration
 * - Quoted message with forwarding context
 */

let handler = async (m, { conn }) => {
    const v = `BEGIN:VCARD
VERSION:3.0
N:;Himejima;;;
FN:Himejima
X-WA-BIZ-NAME:Lern it, Break it, Improve Everyting
X-WA-BIZ-DESCRIPTION:𝙊𝙬𝙣𝙚𝙧 𝙤𝙛 𝙇𝙞𝙗𝙞𝙚
TEL;waid=6289521010900:+62 895-2101-0900
END:VCARD`;

    /*
    const q = {
        key: {
            fromMe: false,
            participant: "12066409886@s.whatsapp.net",
            remoteJid: "status@broadcast",
        },
        message: {
            contactMessage: {
                displayName: "Himejima",
                vcard: v,
            },
        },
    };
    */

    const q = {
        key: {
            fromMe: false,
            participant: "13135550002@s.whatsapp.net",
            remoteJid: "status@broadcast",
        },
        message: {
            interactiveMessage: {
                nativeFlowMessage: {
                    buttons: {
                        0: {
                            name: "payment_info",
                            buttonParamsJson: JSON.stringify({
                                currency: "IDR",
                                total_amount: {
                                    value: 404,
                                    offset: 0,
                                },
                                reference_id: "HIMEJIMA",
                                type: "physical-goods",
                                order: {
                                    status: "pending",
                                    subtotal: {
                                        value: 404,
                                        offset: 0,
                                    },
                                    order_type: "ORDER",
                                    items: [
                                        {
                                            name: "himejima",
                                            amount: {
                                                value: 404,
                                                offset: 0,
                                            },
                                            quantity: 1,
                                            sale_amount: {
                                                value: 404,
                                                offset: 0,
                                            },
                                        },
                                    ],
                                },
                                payment_settings: [
                                    {
                                        type: "pix_static_code",
                                        pix_static_code: {
                                            merchant_name: "himejima",
                                            key: "Lern it Break it Improve Everyting",
                                            key_type: "EVP",
                                        },
                                    },
                                ],
                                share_payment_status: false,
                            }),
                        },
                        length: 1,
                    },
                },
            },
        },
        participant: "13135550002@s.whatsapp.net",
    };

    await conn.sendMessage(
        m.chat,
        {
            contacts: {
                displayName: "Himejima",
                contacts: [{ vcard: v }],
            },
            contextInfo: {
                externalAdReply: {
                    title: "© 2025–2026 Libie",
                    body: "Contact via WhatsApp",
                    mediaType: 1,
                    thumbnailUrl: "https://files.catbox.moe/riml9y.jpg",
                    renderLargerThumbnail: true,

                    showAdAttribution: true,
                    sourceUrl: "https://wa.me/6281933732553",
                },
            },
        },
        { quoted: q }
    );
};

/**
 * Command metadata for help system
 * @property {Array<string>} help - Help text
 * @property {Array<string>} tags - Command categories
 * @property {RegExp} command - Command pattern matching
 */
handler.help = ["owner"];
handler.tags = ["info"];
handler.command = /^(owner|creator)$/i;

handler.desc = [
  "Menampilkan informasi pemilik atau creator bot",
  "Mengirim kontak owner dalam format vCard",
  "Menyertakan nomor WhatsApp bisnis",
  "Menampilkan nama dan identitas pemilik bot",
  "Dilengkapi external preview dan attribution",
  "Cocok untuk kebutuhan kontak dan support"
];

export default handler;