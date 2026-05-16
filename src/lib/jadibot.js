import {
  DisconnectReason
} from "baileys";

import { useSQLiteAuthState } from "#auth";
import { himejima } from "#core/socket.js";

import { join } from "node:path";
import fs from "node:fs";

import { Boom } from "@hapi/boom";

global.jadibots =
  global.jadibots || {};

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
   * pairing code
   */
  try {

    if (!state.creds.registered) {

      // tunggu socket init
      await new Promise(resolve =>
        setTimeout(resolve, 2000)
      );

      const code =
        await jadibotConn.requestPairingCode(
          number
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
        );

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

        const invalidSession =
          !state.creds.registered;

        /*
         * logout / session rusak
         */
        if (
          loggedOut ||
          invalidSession
        ) {

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
          );

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