import https from "https";
import {
    proto,
    prepareWAMessageMedia,
    generateWAMessageFromContent,
} from "baileys";

const getAuth = () =>
    new Promise((resolve, reject) => {
        https
            .get(
                {
                    hostname: "id.pinterest.com",
                    path: "/",
                    headers: {
                        "User-Agent":
                            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",
                    },
                },
                (res) => {
                    const cookies = res.headers["set-cookie"];
                    if (!cookies) return reject(new Error("No cookies"));

                    const csrf = cookies.find((c) =>
                        c.startsWith("csrftoken=")
                    );
                    const sess = cookies.find((c) =>
                        c.startsWith("_pinterest_sess=")
                    );

                    if (!csrf || !sess)
                        return reject(new Error("Missing auth cookies"));

                    const token = csrf.split(";")[0].split("=")[1];
                    resolve({
                        csrf: token,
                        cookie: `csrftoken=${token}; ${
                            sess.split(";")[0]
                        }`,
                    });
                }
            )
            .on("error", reject);
    });

const scrapePinterest = async (query, limit) => {
    const { csrf, cookie } = await getAuth();

    let results = [];
    let bookmark = null;

    while (results.length < limit) {
        const payload = {
            options: {
                query,
                scope: "pins",
                bookmarks: bookmark ? [bookmark] : [],
            },
            context: {},
        };

        const sourceUrl = `/search/pins/?q=${encodeURIComponent(query)}`;
        const body =
            `source_url=${encodeURIComponent(sourceUrl)}` +
            `&data=${encodeURIComponent(JSON.stringify(payload))}`;

        const raw = await new Promise((resolve, reject) => {
            const req = https.request(
                {
                    hostname: "id.pinterest.com",
                    path: "/resource/BaseSearchResource/get/",
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/x-www-form-urlencoded; charset=UTF-8",
                        "X-CSRFToken": csrf,
                        "X-Pinterest-Source-Url": sourceUrl,
                        "X-Requested-With": "XMLHttpRequest",
                        Cookie: cookie,
                        "User-Agent": "Mozilla/5.0",
                    },
                },
                (res) => {
                    let data = "";
                    res.on("data", (c) => (data += c));
                    res.on("end", () => resolve(data));
                }
            );
            req.on("error", reject);
            req.write(body);
            req.end();
        });

        const json = JSON.parse(raw);
        const pins = json?.resource_response?.data?.results || [];

        for (const pin of pins) {
            const image =
                pin?.images?.orig?.url ||
                pin?.images?.["736x"]?.url;

            if (!image) continue;

            results.push({
                image,
                url: `https://id.pinterest.com/pin/${pin.id}`,
            });

            if (results.length >= limit) break;
        }

        bookmark = json?.resource_response?.bookmark;
        if (!bookmark) break;
    }

    return results.slice(0, limit);
};


const handler = async (m, { conn, text }) => {
    try {
        if (!text)
            return m.reply(
                "Usage:\n.pinterest <query> <count>\nExample: .pinterest naruto 5"
            );

        const parts = text.trim().split(" ");
        let limit = 5;
        if (!isNaN(parts.at(-1))) limit = Number(parts.pop());

        limit = Math.min(limit, 10); // WA hard limit
        const query = parts.join(" ");
        if (!query) return m.reply("Query cannot be empty.");
        
        await global.loading(m, conn);

        const results = await scrapePinterest(query, limit);
        if (!results.length) return m.reply("No results found.");

        const cards = [];

        for (let i = 0; i < results.length; i++) {
            const r = results[i];

            const media = await prepareWAMessageMedia(
                { image: { url: r.image } },
                { upload: conn.waUploadToServer }
            );

            cards.push({
                header: {
                    title: `Image result ${query} ${i + 1}`,
                    hasMediaAttachment: true,
                    imageMessage: media.imageMessage,
                },
                body: {
                    text: "Tap the button to open on Pinterest",
                },
                footer: {
                    text: global.config.watermark,
                },
                nativeFlowMessage: {
                    buttons: [
                        {
                            name: "cta_url",
                            buttonParamsJson: JSON.stringify({
                                display_text: "Open url",
                                url: r.url,
                            }),
                        },
                    ],
                },
            });
        }

        const interactive =
            proto.Message.InteractiveMessage.create({
                body: { text: "Pinterest Results" },
                footer: { text: "Swipe →" },
                carouselMessage: {
                    cards,
                    messageVersion: 1,
                },
            });

        const msg = generateWAMessageFromContent(
            m.chat,
            {
                viewOnceMessage: {
                    message: {
                        interactiveMessage: interactive,
                    },
                },
            },
            { userJid: conn.user.id, quoted: m }
        );

        await conn.relayMessage(m.chat, msg.message, {
            messageId: msg.key.id,
            additionalNodes: [
                {
                    tag: "biz",
                    attrs: {},
                    content: [
                        {
                            tag: "interactive",
                            attrs: {
                                type: "native_flow",
                                v: "1",
                            },
                            content: [
                                {
                                    tag: "native_flow",
                                    attrs: {
                                        v: "9",
                                        name: "mixed",
                                    },
                                },
                            ],
                        },
                    ],
                },
            ],
        });
    } catch (e) {
        console.error(e);
        m.reply("Pinterest error: " + e.message);
    }finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["pinterest"];
handler.tags = ["internet"];
handler.command = /^pinterest$/i;

export default handler;