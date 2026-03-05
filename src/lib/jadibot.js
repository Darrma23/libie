import { makeWASocket, DisconnectReason } from "baileys";
import { useSQLiteAuthState } from "#auth";
import { join } from "node:path";
import { Boom } from "@hapi/boom";

export async function startJadiBot({ parentConn, m, sessionDir }) {
  const dbPath = join(sessionDir, "auth.db");

  // WAJIB await (ini biang kerok ERROR kosong)
  const { state, saveCreds } = await useSQLiteAuthState(dbPath);

  const jadibotConn = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    browser: ["Libie JadiBot", "Chrome", "1.0.0"],
  });

  // Flag jadibot
  jadibotConn.isJadiBot = true;
  jadibotConn.ownerLid = m.sender.split("@")[0];

  const number = m.sender.split("@")[0];

  try {
    // Pairing code
    const code = await jadibotConn.requestPairingCode(number);

    await parentConn.reply(
      m.chat,
      `🔑 *Pairing Code JadiBot*\n\n${code}\n\nMasukkan ke WhatsApp > Perangkat Tertaut`,
      m
    );
  } catch (e) {
    global.logger?.error(e);
    await parentConn.reply(
      m.chat,
      `❌ Gagal ambil pairing code:\n${e.message}`,
      m
    );
    return;
  }

  // Save creds
  jadibotConn.ev.on("creds.update", saveCreds);

  // Connection updates
  jadibotConn.ev.on("connection.update", ({ connection, lastDisconnect }) => {
    if (connection === "open") {
      parentConn.reply(m.chat, "✅ JadiBot connected", m);

      global.logger?.info(
        { owner: jadibotConn.ownerLid },
        "JadiBot connected"
      );
    }

    if (connection === "close") {
      const reason = lastDisconnect?.error?.output?.statusCode;

      if (reason === DisconnectReason.loggedOut) {
        parentConn.reply(
          m.chat,
          "❌ JadiBot logout. Session invalid.",
          m
        );

        global.logger?.warn(
          { owner: jadibotConn.ownerLid },
          "JadiBot logged out"
        );
      } else {
        global.logger?.warn(
          { reason },
          "JadiBot disconnected"
        );
      }
    }
  });

  return jadibotConn;
}