const SECRET = "libie";

export function startNotifyServer() {
    Bun.serve({
        port: 3001,

        async fetch(req) {
            const url = new URL(req.url);

            if (url.pathname === "/notify/report" && req.method === "POST") {

                // 🔐 Secret check
                if (req.headers.get("x-secret") !== SECRET) {
                    return Response.json(
                        { status: false, message: "Unauthorized" },
                        { status: 401 }
                    );
                }

                try {
                    const { text } = await req.json();

                    const conn = global.conn;
                    if (!conn?.user) {
                        return Response.json(
                            { status: false, message: "Bot belum siap" },
                            { status: 503 }
                        );
                    }

                    const owners = global.config.owner || [];

                    for (const owner of owners) {
                        const jid = owner.includes("@")
                            ? owner
                            : owner + "@s.whatsapp.net";

                        await conn.sendMessage(jid, { text });
                    }

                    return Response.json({ status: true });

                } catch (err) {
                    console.error("Notify error:", err);

                    return Response.json(
                        { status: false, message: err.message },
                        { status: 500 }
                    );
                }
            }

            return Response.json(
                { status: false, message: "Not Found" },
                { status: 404 }
            );
        }
    });

    console.log("🔔 Notify server running on port 3001");
}