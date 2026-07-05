/**
 * @file Libie bot core entry point and lifecycle manager
 * @module main
 * @description Main initialization file for Libie WhatsApp bot - handles
 * authentication, connection management, plugin loading, and graceful shutdown.
 * @license Apache-2.0
 * @author Himejima
 */

import "./config.js";
import "#db";
import { serialize } from "#core/message.js";
import { useSQLiteAuthState } from "#auth";
import { Browsers, fetchLatestBaileysVersion } from "baileys";
import { dirname, join } from "node:path";
import {
    PluginCache,
    getAllPlugins,
    loadPlugins,
    initHotReload,
    EventManager,
    CleanupManager,
    cleanupReconnect,
} from "#core/connection.js";
import { himejima } from "#core/socket.js";

/**
 * Pairing configuration from global config
 * @private
 * @type {Object}
 */
const pairNum = global.config.pairingNumber;
const pairCode = global.config.pairingCode;

/**
 * Authentication state instance
 * @private
 * @type {Object|null}
 */
let auth = null;

/**
 * Shutdown prevention flag
 * @private
 * @type {boolean}
 */
let isDown = false;

/**
 * Creates a configurable logger instance for Baileys
 * @function logger
 * @returns {Object} Logger object with level-based methods
 *
 * @levels
 * - fatal: Critical errors (60)
 * - error: Runtime errors (50)
 * - warn: Warnings (40)
 * - info: Informational messages (30)
 * - debug: Debug information (20)
 * - trace: Detailed tracing (10)
 * - silent: No logging (controlled by env var)
 *
 * @format
 * - Timestamp: [HH:MM]
 * - Level: UPPERCASE
 * - Structured objects: Pretty-printed with indentation
 * - Errors: Message and stack trace
 */
const logger = () => {
    const LVL = {
        fatal: 60,
        error: 50,
        warn: 40,
        info: 30,
        debug: 20,
        trace: 10,
    };

    // Determine current log level from environment
const curLvl = LVL[Bun.env.BAILEYS_LOG_LEVEL?.toLowerCase() || "info"];
const should = (lvl) => LVL[lvl] >= curLvl;

    /**
     * Formats values for logging
     * @private
     * @function fmt
     * @param {*} val - Value to format
     * @returns {string} Formatted string
     */
    const fmt = (val) => {
        if (val === null) return "null";
        if (val === undefined) return "undefined";
        if (val instanceof Error) return val.message || val.toString();
        if (typeof val === "object") {
            return Bun.inspect(val, { colors: false, depth: 2 });
        }
        return String(val);
    };

    /**
     * Formats log entry with structured output
     * @private
     * @function fmtLog
     * @param {string} lvl - Log level
     * @param {...*} args - Arguments to log
     * @returns {string} Formatted log string
     */
    const fmtLog = (lvl, ...args) => {
        const time = new Date().toTimeString().slice(0, 5);
        const lvlName = lvl.toUpperCase();
        const fmtArgs = args.map((arg) => fmt(arg));

        let msg = "";
        let obj = null;

        // Handle structured logging (first arg is object)
        if (args.length > 0 && typeof args[0] === "object" && args[0] !== null) {
            obj = args[0];
            msg = fmtArgs.slice(1).join(" ");
        } else {
            msg = fmtArgs.join(" ");
        }

        // Pretty print objects
        if (obj && Object.keys(obj).length > 0) {
            const lines = Object.entries(obj)
                .map(([k, v]) => `    ${k}: ${fmt(v)}`)
                .join("\n");
            return `[${time}] ${lvlName}: ${msg}\n${lines}`;
        }
        return `[${time}] ${lvlName}: ${msg}`;
    };

    return {
        level: "silent",
        fatal: (...args) => {
            if (should("fatal")) console.error(fmtLog("fatal", ...args));
        },
        error: (...args) => {
            if (should("error")) console.error(fmtLog("error", ...args));
        },
        warn: (...args) => {
            if (should("warn")) console.warn(fmtLog("warn", ...args));
        },
        info: (...args) => {
            if (should("info")) console.log(fmtLog("info", ...args));
        },
        debug: (...args) => {
            if (should("debug")) console.debug(fmtLog("debug", ...args));
        },
        trace: (...args) => {
            if (should("trace")) console.trace(fmtLog("trace", ...args));
        },
        child: () => logger(),
    };
};

let hotReloadCleanup = null;
let authState = null;

/**
 * Handles pairing code generation for first-time authentication
 * @async
 * @function pair
 * @param {Object} conn - Baileys connection instance
 * @returns {Promise<void>}
 *
 * @flow
 * 1. Wait for connection readiness (3 second timeout)
 * 2. Request pairing code from WhatsApp
 * 3. Format code with dashes (XXXX-XXXX-XXXX)
 * 4. Log pairing code for user
 */
async function pair(conn) {
    return new Promise((res) => {
        const t = setTimeout(res, 3000);

        const chk = setInterval(() => {
            if (conn.user || conn.ws?.readyState === 1) {
                clearInterval(chk);
                clearTimeout(t);
                res();
            }
        }, 100);
    }).then(async () => {
        try {
            let code = await conn.requestPairingCode(pairNum, pairCode);
            code = code?.match(/.{1,4}/g)?.join("-") || code;
            global.logger.info(`Pair code: ${code}`);
        } catch (e) {
            global.logger.error({ error: e.message }, "Pair error");
        }
    });
}

// === GLOBAL SAFETY INIT ===
global.plugins ||= {}
global.db ||= {}
global.db.data ||= {}
global.db.data.chats ||= {}
global.db.data.settings ||= {}

/**
 * Main bot initialization function
 * @async
 * @function LIBIE
 * @returns {Promise<void>}
 *
 * @initializationSteps
 * 1. Initialize SQLite authentication state
 * 2. Fetch latest Baileys version
 * 3. Configure connection options
 * 4. Create connection instance
 * 5. Handle pairing if needed
 * 6. Initialize event and cleanup managers
 * 7. Load and register plugins
 * 8. Start message handler
 */
async function LIBIE() {
  authState = useSQLiteAuthState();

    const { state, saveCreds } = authState;
    const { version: baileysVersion } = await fetchLatestBaileysVersion();

    global.logger.info(
        `[baileys] v${baileysVersion.join(".")} on ${process.platform.toUpperCase()}`
    );

    const connectionOptions = {
      version: baileysVersion,
    
      // MATI TOTAL, GA ADA PINO
      logger: {
        level: "silent",
        info() {},
        error() {},
        warn() {},
        debug() {},
        trace() {},
        child() {
          return this;
        },
      },

  browser: Browsers.windows("Chrome"),
  auth: state,
};

  global.conn = himejima(connectionOptions);
  global.conn.isInit = false;
  
    // Handle pairing for new sessions
    if (!state.creds.registered && pairNum) {
        await pair(global.conn);
    }

    // Initialize managers
    const evt = new EventManager();
    const cln = new CleanupManager();
    global.cleanupManager = cln;
    

    // Create reload handler for hot-reloading
    global.reloadHandler = await evt.createReloadHandler(connectionOptions, saveCreds, cln);

    // Determine plugin directory
    const file = Bun.fileURLToPath(import.meta.url);
    const src = dirname(file);
    const plugDir = join(src, "./plugins");

    // Load all plugins
    const pluginCache = new PluginCache(5000);
    
    // Store plugin directory globally for reloading
    global.pluginFolder = plugDir;
    
    // 1. load plugins dulu
	await loadPlugins(
	  plugDir,
	  (dir, skipCache) => getAllPlugins(dir, pluginCache, skipCache)
	)
	
	// 2. baru import handler
	const hdl = await import("./handler.js")
	evt.setHandler(hdl)
    
    
    // INIT HOT RELOAD (INI YANG BIKIN BOT LU "HIDUP")
    hotReloadCleanup = initHotReload(
      plugDir,
      async (filename, module) => {
        try {
          // FILE DIHAPUS
          if (module === null) {
            const oldPlugin = global.plugins[filename];
    
            if (oldPlugin?.cleanup instanceof Function) {
              try {
                await oldPlugin.cleanup();
              } catch (e) {
                global.logger.warn(
                  { plugin: filename, error: e.message },
                  "Plugin cleanup error"
                );
              }
            }
    
            delete global.plugins[filename];
            global.logger.info({ plugin: filename }, "Plugin removed");
            return;
          }
    
          // FILE DITAMBAH / DIUPDATE
          const oldPlugin = global.plugins[filename];
    
          if (oldPlugin?.cleanup instanceof Function) {
            try {
              await oldPlugin.cleanup();
            } catch (e) {
              global.logger.warn(
                { plugin: filename, error: e.message },
                "Old plugin cleanup error"
              );
            }
          }
    
          global.plugins[filename] = module;
    
          if (module?.init instanceof Function) {
            try {
              await module.init();
            } catch (e) {
              global.logger.warn(
                { plugin: filename, error: e.message },
                "Plugin init error"
              );
            }
          }
    
          global.logger.info({ plugin: filename }, "Plugin reloaded");
        } catch (e) {
          global.logger.error(
            { plugin: filename, error: e.message, stack: e.stack },
            "Hot reload error"
          );
        }
      }
    );

    // Start the bot
    await global.reloadHandler();
    serialize();
}

/**
 * Graceful shutdown procedure
 * @async
 * @function shutdown
 * @param {string} sig - Signal that triggered shutdown
 * @returns {Promise<void>}
 *
 * @cleanupSequence
 * 1. Prevent re-entrance with isDown flag
 * 2. Cleanup reconnection timers
 * 3. Execute cleanup manager tasks
 * 4. Dispose authentication state
 * 5. Close database connections
 * 6. Log shutdown completion
 */
async function shutdown(sig) {
    if (isDown) return;
    isDown = true;

    global.logger.info(`Shutdown (${sig})...`);

    try {
        // Initialize reconnect tracking if not exists
        if (!global.__reconnect) {
            global.__reconnect = {
                attempts: 0,
                lastAt: 0,
                cooldownUntil: 0,
                inflight: false,
                timer: null,
                keepAliveTimer: null,
            };
        }

        // Cleanup reconnection logic
        cleanupReconnect();

        // Execute cleanup manager tasks
        if (global.cleanupManager) {
            try {
                global.cleanupManager.cleanup();
                global.logger.debug("Cleanup done");
            } catch (e) {
                global.logger.warn({ error: e.message }, "Cleanup warn");
            }
        }

        // Dispose authentication state
        if (auth && typeof auth._dispose === "function") {
            try {
                await Promise.race([
                    auth._dispose(),
                    new Promise((_, rej) =>
                        setTimeout(() => rej(new Error("Dispose timeout")), 5000)
                    ),
                ]);
                auth = null;
                global.logger.debug("Auth disposed");
            } catch (e) {
                global.logger.error({ error: e.message }, "Auth dispose error");
            }
        }

        // Close database connections
        if (global.sqlite) {
            try {
                global.sqlite.close();
                global.logger.debug("DB closed");
            } catch (e) {
                global.logger.warn({ error: e.message }, "DB close warn");
            }
        }
        
        if (hotReloadCleanup) {
          hotReloadCleanup();
          hotReloadCleanup = null;
        }

        global.logger.info("Shutdown ok");
    } catch (e) {
        global.logger.error({ error: e.message, stack: e.stack }, "Shutdown error");
    }
}

/**
 * SIGTERM signal handler (graceful termination)
 * @listens SIGTERM
 */
process.on("SIGTERM", async () => {
    await shutdown("SIGTERM");
    process.exit(0);
});

/**
 * SIGINT signal handler (Ctrl+C interruption)
 * @listens SIGINT
 */
process.on("SIGINT", async () => {
    await shutdown("SIGINT");
    process.exit(0);
});

/**
 * Uncaught exception handler
 * @listens uncaughtException
 * @param {Error} e - Uncaught exception
 */
process.on("uncaughtException", async (e) => {
    global.logger.error({ error: e.message, stack: e.stack }, "Uncaught");
    await shutdown("uncaughtException");
    process.exit(1);
});

/**
 * Unhandled promise rejection handler
 * @listens unhandledRejection
 * @param {Error} e - Unhandled rejection
 */
process.on("unhandledRejection", async (e) => {
    global.logger.error({ error: e?.message, stack: e?.stack }, "Unhandled");
    await shutdown("unhandledRejection");
    process.exit(1);
});

/**
 * Main execution entry point
 * @async
 * @execution
 * - Calls LIBIE() to initialize bot
 * - Handles fatal errors with shutdown
 * - Exits with appropriate code
 */
LIBIE().catch(async (e) => {
    global.logger.fatal({ error: e.message, stack: e.stack }, "Fatal");
    await shutdown("fatal");
    process.exit(1);
});
