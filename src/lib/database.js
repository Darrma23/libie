import { join } from "node:path";
import { Database } from "bun:sqlite";

const DB_PATH = join(process.cwd(), "src", "database", "database.db");

/**
 * SQLite database instance with performance optimizations
 * @private
 * @type {Database}
 */
 
if (!global.sqlite) throw new Error("SQLite belum init");
const sqlite = global.sqlite;
const safeRun = global.safeRun || ((fn) => fn());
const logger = global.logger;

/**
 * Database table schemas
 * @private
 * @constant {Object}
 */
const SCHEMAS = {
  user: {
    columns: {
      jid: "TEXT PRIMARY KEY",
      name: "TEXT",

      level: "INTEGER DEFAULT 1",
      exp: "INTEGER DEFAULT 0",
      health: "INTEGER DEFAULT 100",
      healtmonster: "INTEGER DEFAULT 100",
      armor: "INTEGER DEFAULT 0",

      registered: "INTEGER DEFAULT 0",
      reg_time: "INTEGER DEFAULT 0",
      reglast: "INTEGER DEFAULT 0",
      unreglast: "INTEGER DEFAULT 0",
      age: "INTEGER DEFAULT -1",
      created: "INTEGER DEFAULT 0",

      money: "INTEGER DEFAULT 0",
      bank: "INTEGER DEFAULT 0",
      user_limit: "INTEGER DEFAULT 100",
      cupon: "INTEGER DEFAULT 0",
      tiketcoin: "INTEGER DEFAULT 0",

      afk: "INTEGER DEFAULT 0",
      afkReason: "TEXT DEFAULT ''",
      afkTime: "INTEGER DEFAULT 0",
      banned: "INTEGER DEFAULT 0",
      bannedDate: "INTEGER DEFAULT 0",
      premium: "INTEGER DEFAULT 0",
      premiumTime: "INTEGER DEFAULT 0",
      warn: "INTEGER DEFAULT 0",
      role: "TEXT DEFAULT 'Beginner'",
      autolevelup: "INTEGER DEFAULT 1",
      pasangan: "TEXT DEFAULT ''",
      otp: "INTEGER DEFAULT 0",
      kicker: "INTEGER DEFAULT 0",
      kickTime: "INTEGER DEFAULT 0",

      hero: "INTEGER DEFAULT 0",
      exphero: "INTEGER DEFAULT 0",
      pillhero: "INTEGER DEFAULT 0",
      herolastclaim: "INTEGER DEFAULT 0",

      weapon: "INTEGER DEFAULT 0",
      armordurability: "INTEGER DEFAULT 0",
      armormonster: "INTEGER DEFAULT 0",
      sword: "INTEGER DEFAULT 0",
      sworddurability: "INTEGER DEFAULT 0",
      pickaxe: "INTEGER DEFAULT 0",
      pickaxedurability: "INTEGER DEFAULT 0",
      fishingrod: "INTEGER DEFAULT 0",
      fishingroddurability: "INTEGER DEFAULT 0",

      potion: "INTEGER DEFAULT 0",
      diamond: "INTEGER DEFAULT 0",
      emerald: "INTEGER DEFAULT 0",
      emas: "INTEGER DEFAULT 0",
      gold: "INTEGER DEFAULT 0",
      iron: "INTEGER DEFAULT 0",

      boxs: "INTEGER DEFAULT 0",
      gardenboxs: "INTEGER DEFAULT 0",
      common: "INTEGER DEFAULT 0",
      uncommon: "INTEGER DEFAULT 0",
      mythic: "INTEGER DEFAULT 0",
      legendary: "INTEGER DEFAULT 0",

      sampah: "INTEGER DEFAULT 0",
      kayu: "INTEGER DEFAULT 0",
      botol: "INTEGER DEFAULT 0",
      kaleng: "INTEGER DEFAULT 0",
      kardus: "INTEGER DEFAULT 0",
      batu: "INTEGER DEFAULT 0",
      string: "INTEGER DEFAULT 0",
      wood: "INTEGER DEFAULT 0",

      pisang: "INTEGER DEFAULT 0",
      mangga: "INTEGER DEFAULT 0",
      jeruk: "INTEGER DEFAULT 0",
      anggur: "INTEGER DEFAULT 0",
      apel: "INTEGER DEFAULT 0",

      bibitpisang: "INTEGER DEFAULT 0",
      bibitmangga: "INTEGER DEFAULT 0",
      bibitjeruk: "INTEGER DEFAULT 0",
      bibitanggur: "INTEGER DEFAULT 0",
      bibitapel: "INTEGER DEFAULT 0",

      pet: "INTEGER DEFAULT 0",
      kucing: "INTEGER DEFAULT 0",
      anakkucing: "INTEGER DEFAULT 0",
      kuda: "INTEGER DEFAULT 0",
      anakkuda: "INTEGER DEFAULT 0",
      rubah: "INTEGER DEFAULT 0",
      anakrubah: "INTEGER DEFAULT 0",
      anjing: "INTEGER DEFAULT 0",
      anakanjing: "INTEGER DEFAULT 0",
      serigala: "INTEGER DEFAULT 0",
      anakserigala: "INTEGER DEFAULT 0",
      naga: "INTEGER DEFAULT 0",
      anaknaga: "INTEGER DEFAULT 0",
      phonix: "INTEGER DEFAULT 0",
      anakphonix: "INTEGER DEFAULT 0",
      kyubi: "INTEGER DEFAULT 0",
      anakkyubi: "INTEGER DEFAULT 0",
      griffin: "INTEGER DEFAULT 0",
      anakgriffin: "INTEGER DEFAULT 0",
      centaur: "INTEGER DEFAULT 0",
      anakcentaur: "INTEGER DEFAULT 0",

      horse: "INTEGER DEFAULT 0",
      horseexp: "INTEGER DEFAULT 0",
      horselastfeed: "INTEGER DEFAULT 0",

      cat: "INTEGER DEFAULT 0",
      catexp: "INTEGER DEFAULT 0",
      catlastfeed: "INTEGER DEFAULT 0",

      fox: "INTEGER DEFAULT 0",
      foxexp: "INTEGER DEFAULT 0",
      foxlastfeed: "INTEGER DEFAULT 0",

      dog: "INTEGER DEFAULT 0",
      dogexp: "INTEGER DEFAULT 0",
      doglastfeed: "INTEGER DEFAULT 0",

      makananpet: "INTEGER DEFAULT 0",
      makananphonix: "INTEGER DEFAULT 0",
      makanangriffin: "INTEGER DEFAULT 0",
      makanannaga: "INTEGER DEFAULT 0",
      makanankyubi: "INTEGER DEFAULT 0",
      makanancentaur: "INTEGER DEFAULT 0",

      aqua: "INTEGER DEFAULT 0",
      umpan: "INTEGER DEFAULT 0",
      pancingan: "INTEGER DEFAULT 0",
      anakpancingan: "INTEGER DEFAULT 0",

      paus: "INTEGER DEFAULT 0",
      kepiting: "INTEGER DEFAULT 0",
      cumi: "INTEGER DEFAULT 0",
      gurita: "INTEGER DEFAULT 0",
      buntal: "INTEGER DEFAULT 0",
      dory: "INTEGER DEFAULT 0",
      lobster: "INTEGER DEFAULT 0",
      lumba: "INTEGER DEFAULT 0",
      hiu: "INTEGER DEFAULT 0",
      ikan: "INTEGER DEFAULT 0",
      udang: "INTEGER DEFAULT 0",
      orca: "INTEGER DEFAULT 0",

      lastclaim: "INTEGER DEFAULT 0",
      lastdaily: "INTEGER DEFAULT 0",
      lastweekly: "INTEGER DEFAULT 0",
      lastmonthly: "INTEGER DEFAULT 0",
      lastgc: "INTEGER DEFAULT 0",

      lastfishing: "INTEGER DEFAULT 0",
      lastdagang: "INTEGER DEFAULT 0",
      lastmancing: "INTEGER DEFAULT 0",

      lastwarpet: "INTEGER DEFAULT 0",
      lastadventure: "INTEGER DEFAULT 0",
      lastdungeon: "INTEGER DEFAULT 0",
      lastduel: "INTEGER DEFAULT 0",
      lastmining: "INTEGER DEFAULT 0",
      lasthunt: "INTEGER DEFAULT 0",
      lastrob: "INTEGER DEFAULT 0",

      lastmulung: "INTEGER DEFAULT 0",
      lastnebang: "INTEGER DEFAULT 0",
      lastnambang: "INTEGER DEFAULT 0",
      lastberkebon: "INTEGER DEFAULT 0",
      lastbunuhi: "INTEGER DEFAULT 0",
      lastpekerjaan: "INTEGER DEFAULT 0",

      lastopen: "INTEGER DEFAULT 0",
      lasteasy: "INTEGER DEFAULT 0",
      lastnormal: "INTEGER DEFAULT 0",
      lasthard: "INTEGER DEFAULT 0",

      lastlink: "INTEGER DEFAULT 0",
      lastcode: "INTEGER DEFAULT 0",

      snlast: "INTEGER DEFAULT 0",
      judilast: "INTEGER DEFAULT 0",
      spinlast: "INTEGER DEFAULT 0",

      ramuan: "INTEGER DEFAULT 0",
      ramuannagalast: "INTEGER DEFAULT 0",
      ramuanrubahlast: "INTEGER DEFAULT 0",
      ramuankucinglast: "INTEGER DEFAULT 0",
      ramuanserigalalast: "INTEGER DEFAULT 0",
      ramuangriffinlast: "INTEGER DEFAULT 0",
      ramuanphonixlast: "INTEGER DEFAULT 0",
      ramuancentaurlast: "INTEGER DEFAULT 0",
      ramuankyubilast: "INTEGER DEFAULT 0",
      ramuanherolast: "INTEGER DEFAULT 0",

      lastramuanclaim: "INTEGER DEFAULT 0",
      lastpotionclaim: "INTEGER DEFAULT 0",
      laststringclaim: "INTEGER DEFAULT 0",
      lastswordclaim: "INTEGER DEFAULT 0",
      lastweaponclaim: "INTEGER DEFAULT 0",
      lastsironclaim: "INTEGER DEFAULT 0",

      kerjasatu: "INTEGER DEFAULT 0",
      kerjadua: "INTEGER DEFAULT 0",
      kerjatiga: "INTEGER DEFAULT 0",
      kerjaempat: "INTEGER DEFAULT 0",
      kerjalima: "INTEGER DEFAULT 0",
      kerjaenam: "INTEGER DEFAULT 0",
      kerjatujuh: "INTEGER DEFAULT 0",
      kerjadelapan: "INTEGER DEFAULT 0",
      kerjasembilan: "INTEGER DEFAULT 0",
      kerjasepuluh: "INTEGER DEFAULT 0",
      kerjasebelas: "INTEGER DEFAULT 0",
      kerjaduabelas: "INTEGER DEFAULT 0",
      kerjatigabelas: "INTEGER DEFAULT 0",
      kerjaempatbelas: "INTEGER DEFAULT 0",
      kerjalimabelas: "INTEGER DEFAULT 0",
      kerjaenambelas: "INTEGER DEFAULT 0",
      kerjatujuhbelas: "INTEGER DEFAULT 0",
      kerjadelapanbelas: "INTEGER DEFAULT 0",
      kerjasembilanbelas: "INTEGER DEFAULT 0",
      kerjaduapuluh: "INTEGER DEFAULT 0",
      kerjaduasatu: "INTEGER DEFAULT 0",
      kerjaduadua: "INTEGER DEFAULT 0",
      kerjaduatiga: "INTEGER DEFAULT 0",
      kerjaduaempat: "INTEGER DEFAULT 0",
      kerjadualima: "INTEGER DEFAULT 0",
      kerjaduaenam: "INTEGER DEFAULT 0",
      kerjaduatujuh: "INTEGER DEFAULT 0",
      kerjaduadelapan: "INTEGER DEFAULT 0",
      kerjaduasembilan: "INTEGER DEFAULT 0",
      kerjatigapuluh: "INTEGER DEFAULT 0",
    },
    indices: ["CREATE INDEX IF NOT EXISTS idx_user_jid ON user(jid)"],
  },

  // ========== TABEL ORDERS UNTUK AUTOBUY ==========
  orders: {
    columns: {
      id: "TEXT PRIMARY KEY",
      user_id: "TEXT NOT NULL",
      item: "TEXT NOT NULL",
      quantity: "INTEGER DEFAULT 1",
      total_price: "INTEGER NOT NULL",
      status: "TEXT DEFAULT 'pending'",
      payment_id: "TEXT",
      created_at: "INTEGER DEFAULT (unixepoch())",
      updated_at: "INTEGER",
    },
    indices: [
      "CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id)",
      "CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)",
    ],
  },
};

/**
 * Ensures a table exists with proper schema
 * @private
 * @function ensureTable
 * @param {string} tableName - Table name
 * @param {Object} schema - Table schema definition
 * @returns {void}
 */
function ensureTable(tableName, schema) {
    const exists = sqlite
        .query("SELECT name FROM sqlite_master WHERE type='table' AND name=?")
        .get(tableName);

    const columnDefs = Object.entries(schema.columns)
        .map(([col, def]) => `${col} ${def}`)
        .join(", ");

    if (!exists) {
        sqlite.exec(`CREATE TABLE ${tableName} (${columnDefs})`);

        // Create indices
        if (schema.indices) {
            for (const idx of schema.indices) {
                sqlite.exec(idx);
            }
        }
    } else {
        // Check for missing columns and add them
        const existingCols = sqlite
            .query(`PRAGMA table_info(${tableName})`)
            .all()
            .map((c) => c.name);

        for (const [col, def] of Object.entries(schema.columns)) {
            if (!existingCols.includes(col)) {
                sqlite.exec(`ALTER TABLE ${tableName} ADD COLUMN ${col} ${def}`);
            }
        }
    }
}

// Initialize all tables
for (const [tableName, schema] of Object.entries(SCHEMAS)) {
    ensureTable(tableName, schema);
}

// Optimize database after schema changes
sqlite.exec("PRAGMA optimize");

/**
 * Prepared SQL statements cache
 * @private
 * @constant {Object}
 */
const STMTS = {
    getRow: {},
    insertRow: {},
    updateCol: {},
    deleteRow: {},
};

/**
 * Tables that use JID as primary key
 * @private
 * @constant {Array<string>}
 */
const TABLES_WITH_JID = ["user"];

// Prepare statements for JID-based tables
for (const table of TABLES_WITH_JID) {
    STMTS.getRow[table] = sqlite.query(`SELECT * FROM ${table} WHERE jid = ?`);
    STMTS.insertRow[table] = sqlite.query(`INSERT OR IGNORE INTO ${table} (jid) VALUES (?)`);
    STMTS.deleteRow[table] = sqlite.query(`DELETE FROM ${table} WHERE jid = ?`);

    // Prepare update statements for each column
    STMTS.updateCol[table] = {};
    for (const col of Object.keys(SCHEMAS[table].columns)) {
        if (col !== "jid") {
            STMTS.updateCol[table][col] = sqlite.query(
                `UPDATE ${table} SET ${col} = ? WHERE jid = ?`
            );
        }
    }
}

/**
 * LRU cache for database rows
 * @class RowCache
 * @private
 */
class RowCache {
    /**
     * Creates a new RowCache instance
     * @constructor
     * @param {number} maxSize - Maximum cache size
     */
    constructor(maxSize = 100) {
        this.cache = new Map();
        this.maxSize = maxSize;
    }

    /**
     * Gets a value from cache
     * @method get
     * @param {string} key - Cache key
     * @returns {*|undefined} Cached value or undefined
     */
    get(key) {
        return this.cache.get(key);
    }

    /**
     * Sets a value in cache with LRU eviction
     * @method set
     * @param {string} key - Cache key
     * @param {*} value - Value to cache
     * @returns {void}
     */
    set(key, value) {
        if (this.cache.size >= this.maxSize) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
        this.cache.set(key, value);
    }

    /**
     * Deletes a value from cache
     * @method delete
     * @param {string} key - Cache key to delete
     * @returns {void}
     */
    delete(key) {
        this.cache.delete(key);
    }

    /**
     * Clears all cached values
     * @method clear
     * @returns {void}
     */
    clear() {
        this.cache.clear();
    }
}

/**
 * Database wrapper with proxy-based access and caching
 * @class DataWrapper
 * @private
 */
class DataWrapper {
    constructor() {
        // Initialize row caches
        this.rowCaches = {
            user: new RowCache(100),
        };

        // Create proxy-based data accessors
        this.data = {
            user: this._createProxy("user"),
        };
    }

    /**
     * Creates a Proxy for table access
     * @private
     * @method _createProxy
     * @param {string} table - Table name
     * @returns {Proxy} Table access proxy
     */
    _createProxy(table) {
        const cache = this.rowCaches[table];

        return new Proxy(
            {},
            {
                get: (_, jid) => {
                    if (typeof jid !== "string") return undefined;

                    const cacheKey = `${table}:${jid}`;
                    let cached = cache.get(cacheKey);
                    if (cached) return cached;

                    // Query database
                    let row = STMTS.getRow[table].get(jid);

                    // Create row if doesn't exist
                    if (!row) {
                        STMTS.insertRow[table].run(jid);
                        row = STMTS.getRow[table].get(jid);
                    }

                    // Create proxy for row access
                    const proxy = this._createRowProxy(table, jid, row);
                    cache.set(cacheKey, proxy);
                    return proxy;
                },

                has: (_, jid) => {
                    if (typeof jid !== "string") return false;
                    const row = STMTS.getRow[table].get(jid);
                    return !!row;
                },

                deleteProperty: (_, jid) => {
                    if (typeof jid !== "string") return false;
                    safeRun(() => STMTS.deleteRow[table].run(jid));
                    cache.delete(`${table}:${jid}`);
                    return true;
                },
            }
        );
    }

    /**
     * Creates a Proxy for individual row access
     * @private
     * @method _createRowProxy
     * @param {string} table - Table name
     * @param {string} jid - JID identifier
     * @param {Object} rowData - Row data object
     * @returns {Proxy} Row access proxy
     */
    _createRowProxy(table, jid, rowData) {
        return new Proxy(rowData, {
            set: (obj, prop, value) => {
                // Validate column exists
                if (!Object.prototype.hasOwnProperty.call(SCHEMAS[table].columns, prop)) {
                    logger.warn({ table, prop }, "Unknown column");
                    return false;
                }

                // Normalize boolean values
                const normalizedValue = typeof value === "boolean" ? (value ? 1 : 0) : value;

                // Update database
                const stmt = STMTS.updateCol[table][prop];
                if (stmt) {
                    safeRun(() => stmt.run(normalizedValue, jid));
                    obj[prop] = normalizedValue;
                    return true;
                }

                return false;
            },

            get: (obj, prop) => {
                if (prop === "toJSON") {
                    return () => ({ ...obj });
                }
                return obj[prop];
            },
        });
    }

    /**
     * Clears specified cache or all caches
     * @method clearCache
     * @param {string} [table] - Specific table cache to clear
     * @returns {void}
     */
    clearCache(table) {
        if (table) {
            this.rowCaches[table]?.clear();
        } else {
            for (const cache of Object.values(this.rowCaches)) {
                cache.clear();
            }
        }
    }

    /**
     * Closes the data wrapper and clears caches
     * @method close
     * @returns {void}
     */
    close() {
        this.clearCache();
    }
}

/**
 * Global database instance
 * @type {DataWrapper}
 */
const db = new DataWrapper();

/**
 * Global database references
 * @global
 * @property {DataWrapper} db - Database wrapper instance
 * @property {Database} sqlite - Raw SQLite database instance
 */
global.rpg = db;

/**
 * Get all users for leaderboard / analytics
 * @global
 * @returns {Array<Object>}
 */
global.getAllUsers = function () {
    return sqlite
        .query(`
            SELECT 
                jid,
                exp,
                level,
                money,
                user_limit
            FROM user
        `)
        .all();
};

export const ROLES = [
	  			{ name: 'Warrior V', level: 0 }, { name: 'Warrior IV', level: 4 }, { name: 'Warrior III', level: 8 }, { name: 'Warrior II', level: 12 }, { name: 'Warrior I', level: 16 },
      { name: 'Paladin V', level: 20 }, { name: 'Paladin IV', level: 24 }, { name: 'Paladin III', level: 28 }, { name: 'Paladin II', level: 32 }, { name: 'Paladin I', level: 36 },
      { name: 'Sorcerer V', level: 40 }, { name: 'Sorcerer IV', level: 44 }, { name: 'Sorcerer III', level: 48 }, { name: 'Sorcerer II', level: 52 }, { name: 'Sorcerer I', level: 56 },
      { name: 'Ranger V', level: 60 }, { name: 'Ranger IV', level: 64 }, { name: 'Ranger III', level: 68 }, { name: 'Ranger II', level: 72 }, { name: 'Ranger I', level: 76 },
      { name: 'Mage V', level: 80 }, { name: 'Mage IV', level: 84 }, { name: 'Mage III', level: 88 }, { name: 'Mage II', level: 92 }, { name: 'Mage I', level: 96 },
      { name: 'Cleric V', level: 100 }, { name: 'Cleric IV', level: 104 }, { name: 'Cleric III', level: 108 }, { name: 'Cleric II', level: 112 }, { name: 'Cleric I', level: 116 },
      { name: 'Thief V', level: 120 }, { name: 'Thief IV', level: 124 }, { name: 'Thief III', level: 128 }, { name: 'Thief II', level: 132 }, { name: 'Thief I', level: 136 },
      { name: 'Assassin V', level: 140 }, { name: 'Assassin IV', level: 144 }, { name: 'Assassin III', level: 148 }, { name: 'Assassin II', level: 152 }, { name: 'Assassin I', level: 156 },
      { name: 'Monk V', level: 160 }, { name: 'Monk IV', level: 164 }, { name: 'Monk III', level: 168 }, { name: 'Monk II', level: 172 }, { name: 'Monk I', level: 176 },
      { name: 'Bard V', level: 180 }, { name: 'Bard IV', level: 184 }, { name: 'Bard III', level: 188 }, { name: 'Bard II', level: 192 }, { name: 'Bard I', level: 196 },
      { name: 'Necromancer V', level: 200 }, { name: 'Necromancer IV', level: 204 }, { name: 'Necromancer III', level: 208 }, { name: 'Necromancer II', level: 212 }, { name: 'Necromancer I', level: 216 },
      { name: 'Warlock V', level: 220 }, { name: 'Warlock IV', level: 224 }, { name: 'Warlock III', level: 228 }, { name: 'Warlock II', level: 232 }, { name: 'Warlock I', level: 236 },
      { name: 'Wizard V', level: 240 }, { name: 'Wizard IV', level: 244 }, { name: 'Wizard III', level: 248 }, { name: 'Wizard II', level: 252 }, { name: 'Wizard I', level: 256 },
      { name: 'Sage V', level: 260 }, { name: 'Sage IV', level: 264 }, { name: 'Sage III', level: 268 }, { name: 'Sage II', level: 272 }, { name: 'Sage I', level: 276 },
      { name: 'Priest V', level: 280 }, { name: 'Priest IV', level: 284 }, { name: 'Priest III', level: 288 }, { name: 'Priest II', level: 292 }, { name: 'Priest I', level: 296 },
      { name: 'Rogue V', level: 300 }, { name: 'Rogue IV', level: 304 }, { name: 'Rogue III', level: 308 }, { name: 'Rogue II', level: 312 }, { name: 'Rogue I', level: 316 },
      { name: 'Brawler V', level: 320 }, { name: 'Brawler IV', level: 324 }, { name: 'Brawler III', level: 328 }, { name: 'Brawler II', level: 332 }, { name: 'Brawler I', level: 336 },
      { name: 'Archer V', level: 340 }, { name: 'Archer IV', level: 344 }, { name: 'Archer III', level: 348 }, { name: 'Archer II', level: 352 }, { name: 'Archer I', level: 356 },
      { name: 'Sniper V', level: 360 }, { name: 'Sniper IV', level: 364 }, { name: 'Sniper III', level: 368 }, { name: 'Sniper II', level: 372 }, { name: 'Sniper I', level: 376 },
      { name: 'Ninja V', level: 380 }, { name: 'Ninja IV', level: 384 }, { name: 'Ninja III', level: 388 }, { name: 'Ninja II', level: 392 }, { name: 'Ninja I', level: 396 },
      { name: 'Samurai V', level: 400 }, { name: 'Samurai IV', level: 404 }, { name: 'Samurai III', level: 408 }, { name: 'Samurai II', level: 412 }, { name: 'Samurai I', level: 416 },
      { name: 'Berserker V', level: 420 }, { name: 'Berserker IV', level: 424 }, { name: 'Berserker III', level: 428 }, { name: 'Berserker II', level: 432 }, { name: 'Berserker I', level: 436 },
      { name: 'Legend V', level: 440 }, { name: 'Legend IV', level: 444 }, { name: 'Legend III', level: 448 }, { name: 'Legend II', level: 452 }, { name: 'Legend I', level: 456 },
      { name: 'Champion V', level: 460 }, { name: 'Champion IV', level: 464 }, { name: 'Champion III', level: 468 }, { name: 'Champion II', level: 472 }, { name: 'Champion I', level: 476 },
      { name: 'Grandmaster V', level: 480 }, { name: 'Grandmaster IV', level: 484 }, { name: 'Grandmaster III', level: 488 }, { name: 'Grandmaster II', level: 492 }, { name: 'Grandmaster I', level: 496 },
      { name: 'Elder V', level: 500 }, { name: 'Elder IV', level: 504 }, { name: 'Elder III', level: 508 }, { name: 'Elder II', level: 512 }, { name: 'Elder I', level: 516 },
      { name: 'Immortal V', level: 520 }, { name: 'Immortal IV', level: 524 }, { name: 'Immortal III', level: 528 }, { name: 'Immortal II', level: 532 }, { name: 'Immortal I', level: 536 },
      { name: 'Nephalem V', level: 540 }, { name: 'Nephalem IV', level: 544 }, { name: 'Nephalem III', level: 548 }, { name: 'Nephalem II', level: 552 }, { name: 'Nephalem I', level: 556 },
      { name: 'Eternal V', level: 560 }, { name: 'Eternal IV', level: 564 }, { name: 'Eternal III', level: 568 }, { name: 'Eternal II', level: 572 }, { name: 'Eternal I', level: 576 },
      { name: 'Neptune V', level: 580 }, { name: 'Neptune IV', level: 584 }, { name: 'Neptune III', level: 588 }, { name: 'Neptune II', level: 592 }, { name: 'Neptune I', level: 596 },
      { name: 'Pluto V', level: 600 }, { name: 'Pluto IV', level: 604 }, { name: 'Pluto III', level: 608 }, { name: 'Pluto II', level: 612 }, { name: 'Pluto I', level: 616 },
      { name: 'Eris V', level: 620 }, { name: 'Eris IV', level: 624 }, { name: 'Eris III', level: 628 }, { name: 'Eris II', level: 632 }, { name: 'Eris I', level: 636 },
      { name: 'Ascension V', level: 640 }, { name: 'Ascension IV', level: 644 }, { name: 'Ascension III', level: 648 }, { name: 'Ascension II', level: 652 }, { name: 'Ascension I', level: 656 },
      { name: 'Elysium V', level: 660 }, { name: 'Elysium IV', level: 664 }, { name: 'Elysium III', level: 668 }, { name: 'Elysium II', level: 672 }, { name: 'Elysium I', level: 676 },
      { name: 'Ether V', level: 680 }, { name: 'Ether IV', level: 684 }, { name: 'Ether III', level: 688 }, { name: 'Ether II', level: 692 }, { name: 'Ether I', level: 696 },
      { name: 'Gaea V', level: 700 }, { name: 'Gaea IV', level: 704 }, { name: 'Gaea III', level: 708 }, { name: 'Gaea II', level: 712 }, { name: 'Gaea I', level: 716 },
      { name: 'Hades V', level: 720 }, { name: 'Hades IV', level: 724 }, { name: 'Hades III', level: 728 }, { name: 'Hades II', level: 732 }, { name: 'Hades I', level: 736 },
      { name: 'Heimdall V', level: 740 }, { name: 'Heimdall IV', level: 744 }, { name: 'Heimdall III', level: 748 }, { name: 'Heimdall II', level: 752 }, { name: 'Heimdall I', level: 756 },
      { name: 'Hyperion V', level: 760 }, { name: 'Hyperion IV', level: 764 }, { name: 'Hyperion III', level: 768 }, { name: 'Hyperion II', level: 772 }, { name: 'Hyperion I', level: 776 },
      { name: 'Iris V', level: 780 }, { name: 'Iris IV', level: 784 }, { name: 'Iris III', level: 788 }, { name: 'Iris II', level: 792 }, { name: 'Iris I', level: 796 },
      { name: 'Jupiter V', level: 800 }, { name: 'Jupiter IV', level: 804 }, { name: 'Jupiter III', level: 808 }, { name: 'Jupiter II', level: 812 }, { name: 'Jupiter I', level: 816 },
      { name: 'Kronos V', level: 820 }, { name: 'Kronos IV', level: 824 }, { name: 'Kronos III', level: 828 }, { name: 'Kronos II', level: 832 }, { name: 'Kronos I', level: 836 },
      { name: 'Lilith V', level: 840 }, { name: 'Lilith IV', level: 844 }, { name: 'Lilith III', level: 848 }, { name: 'Lilith II', level: 852 }, { name: 'Lilith I', level: 856 },
      { name: 'Maelstrom V', level: 860 }, { name: 'Maelstrom IV', level: 864 }, { name: 'Maelstrom III', level: 868 }, { name: 'Maelstrom II', level: 872 }, { name: 'Maelstrom I', level: 876 },
      { name: 'Nova V', level: 880 }, { name: 'Nova IV', level: 884 }, { name: 'Nova III', level: 888 }, { name: 'Nova II', level: 892 }, { name: 'Nova I', level: 896 },
      { name: 'Odin V', level: 900 }, { name: 'Odin IV', level: 904 }, { name: 'Odin III', level: 908 }, { name: 'Odin II', level: 912 }, { name: 'Odin I', level: 916 },
      { name: 'Osiris V', level: 920 }, { name: 'Osiris IV', level: 924 }, { name: 'Osiris III', level: 928 }, { name: 'Osiris II', level: 932 }, { name: 'Osiris I', level: 936 },
      { name: 'Poseidon V', level: 940 }, { name: 'Poseidon IV', level: 944 }, { name: 'Poseidon III', level: 948 }, { name: 'Poseidon II', level: 952 }, { name: 'Poseidon I', level: 956 },
      { name: 'Ragnarok V', level: 960 }, { name: 'Ragnarok IV', level: 964 }, { name: 'Ragnarok III', level: 968 }, { name: 'Ragnarok II', level: 972 }, { name: 'Ragnarok I', level: 976 },
      { name: 'Saturn V', level: 980 }, { name: 'Saturn IV', level: 984 }, { name: 'Saturn III', level: 988 }, { name: 'Saturn II', level: 992 }, { name: 'Saturn I', level: 996 },
      { name: 'Titan V', level: 1000 }, { name: 'Titan IV', level: 1004 }, { name: 'Titan III', level: 1008 }, { name: 'Titan II', level: 1012 }, { name: 'Titan I', level: 1016 },
      { name: 'Uranus V', level: 1020 }, { name: 'Uranus IV', level: 1024 }, { name: 'Uranus III', level: 1028 }, { name: 'Uranus II', level: 1032 }, { name: 'Uranus I', level: 1036 },
      { name: 'Venus V', level: 1040 }, { name: 'Venus IV', level: 1044 }, { name: 'Venus III', level: 1048 }, { name: 'Venus II', level: 1052 }, { name: 'Venus I', level: 1056 },
      { name: 'Zeus V', level: 1060 }, { name: 'Zeus IV', level: 1064 }, { name: 'Zeus III', level: 1068 }, { name: 'Zeus II', level: 1072 }, { name: 'Zeus I', level: 1076 },
      ]
      
export function getRoleByLevel(level) {
  let role = ROLES[0].name;
  for (const r of ROLES) {
    if (level >= r.level) role = r.name;
    else break;
  }
  return role;
}
