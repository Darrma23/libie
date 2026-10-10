import {
  DisconnectReason
} from "baileys";

import { useSQLiteAuthState } from "#auth";
import { himejima } from "#core/socket.js";
import { handler } from "../handler.js";

import { join } from "node:path";
import fs from "node:fs";

import { Boom } from "@hapi/boom";

global.jadibots =
  global.jadibots || {};

global.__jadibotMsgIds =
  global.__jadibotMsgIds || new Set();

export default async function startJadiBot({
  parentConn,
  m,
  sessionDir,
  number
}) {

  const dbPath =
    join(sessionDir, "auth.db");

  const {
    state,
    saveCreds
  } = await useSQLiteAuthState(dbPath);

  /*
   * pakai wrapper utama
   * supaya semua helper ikut
   */
  const jadibotConn = himejima({

    auth: state,

    printQRInTerminal: false,

    // ngurangin sync aneh
    syncFullHistory: false,

    // jangan agresif online
    markOnlineOnConnect: false,

    browser: [
      "Ubuntu",
      "Chrome",
      "20.0.04"
    ]
  });

  /*
   * flag jadibot
   */
  jadibotConn.isJadiBot = true;

  /*
   * owner session
   */
  jadibotConn.ownerLid = number;

  /*
   * mode public
   */
  jadibotConn.public = true;

  /*
   * save creds
   */
  jadibotConn.ev.on(
    "creds.update",
    saveCreds
  );

  /*
   * message handler
   */
  jadibotConn.ev.on("messages.upsert", async (chatUpdate) => {
    try {

      // skip retry / append, cuma proses pesan baru
      if (chatUpdate.type && chatUpdate.type !== "notify") return;

      const msg = chatUpdate.messages?.[0];
      if (!msg) return;

      // skip status broadcast
      if (msg.key?.remoteJid === "status@broadcast") return;

      // skip pesan sendiri
      if (msg.key?.fromMe) return;

      // dedup pakai message id
      const msgId = msg.key?.id;
      if (msgId) {
        if (global.__jadibotMsgIds.has(msgId)) {
          global.logger?.debug?.(
            { msgId },
            "jadibot: duplicate message skipped"
          );
          return;
        }
        global.__jadibotMsgIds.add(msgId);
        if (global.__jadibotMsgIds.size > 500) {
          const first =
            global.__jadibotMsgIds.values().next().value;
          global.__jadibotMsgIds.delete(first);
        }
      }

      const m = jadibotConn.serializeM(msg);
      if (!m) return;

      await handler.call(jadibotConn, m, {
        conn: jadibotConn,
        text: m.text
      });

    } catch (e) {
      global.logger?.error(
        { err: e.message, stack: e.stack },
        "jadibot message error"
      );
    }
  });

  /*
   * pairing code
   */
  try {

    if (!state.creds.registered) {

      // tunggu socket init
      await new Promise(resolve =>
        setTimeout(resolve, 2000)
      );

      // DEBUG: cek socket state sebelum pairing
      global.logger?.info?.({
        wsOpen: jadibotConn.ws?.isOpen,
        wsReadyState: jadibotConn.ws?.readyState,
        hasRequestPairing: typeof jadibotConn.requestPairingCode,
      }, "jadibot: socket state before pairing");

      const code =
        await jadibotConn.requestPairingCode(
          number,
          global.config?.pairingCode
        );

      await parentConn.reply(
        m.chat,
        `🔑 *Pairing Code JadiBot*\n\n${code}\n\nMasukkan ke:\nWhatsApp > Perangkat Tertaut`,
        m
      );
    }

  } catch (e) {

    console.error(e);

    global.logger?.error(e);

    try {

      fs.rmSync(sessionDir, {
        recursive: true,
        force: true
      });

    } catch {}

    await parentConn.reply(
      m.chat,
      `❌ Gagal membuat pairing code.\n\n${e.message}`,
      m
    );

    return null;
  }

  /*
   * connection update
   */
  jadibotConn.ev.on(
    "connection.update",
    async ({
      connection,
      lastDisconnect
    }) => {

      const reason =
        new Boom(
          lastDisconnect?.error
        )?.output?.statusCode;

      /*
       * connected
       */
      if (connection === "open") {

        global.jadibots[number] =
          jadibotConn;

        await parentConn.reply(
          m.chat,
          "✅ JadiBot connected.",
          m
        ).catch(() => {});

        global.logger?.info(
          {
            owner: number
          },
          "JadiBot connected"
        );
      }

      /*
       * disconnected
       */
      if (connection === "close") {

        delete global.jadibots[number];

        try {
          jadibotConn.ws.close();
        } catch {}

        const loggedOut =
          reason === DisconnectReason.loggedOut;

        // hapus session cuma kalau bener2 logout
        // atau 405 (method_not_allowed, biasanya karena double-pairing)
        const shouldDeleteSession =
          loggedOut || reason === 405;

        /*
         * logout / session rusak
         */
        if (shouldDeleteSession) {

          try {

            fs.rmSync(sessionDir, {
              recursive: true,
              force: true
            });

          } catch {}

          await parentConn.reply(
            m.chat,
            "❌ JadiBot logout.\nSession dihapus.",
            m
          ).catch(() => {});

          global.logger?.warn(
            {
              owner: number,
              reason
            },
            "JadiBot logged out"
          );

          return;
        }

        /*
         * reconnect
         */
        global.logger?.warn(
          {
            owner: number,
            reason
          },
          "JadiBot reconnecting..."
        );

        setTimeout(() => {

          startJadiBot({
            parentConn,
            m,
            sessionDir,
            number
          });

        }, 5000);
      }
    }
  );

  return jadibotConn;
}