/**
 * @file Command index builder — O(1) command lookup
 * @module lib/core/command-index
 * @description Menggantikan loop O(n) di handler.js dengan lookup instan.
 *   Setiap plugin di-index berdasarkan command-nya:
 *   - Command string → masuk Map (lookup O(1))
 *   - Command regex  → masuk list terpisah (loop kecil, <50 biasanya)
 */

/**
 * Build command index dari global.plugins
 * @function buildCommandIndex
 * @returns {Object} Statistik index
 */
export function buildCommandIndex() {
  const index = new Map();
  const regexList = [];
  const allList = [];
  const beforeList = [];
  const helpCache = [];

  const duplicates = [];
  let totalPlugins = 0;

  for (const name in global.plugins) {
    const plugin = global.plugins[name];
    if (!plugin || plugin.disabled) continue;
    totalPlugins++;

    // 1. Lifecycle hooks
    if (typeof plugin.all === "function") {
      allList.push({ name, plugin });
    }
    if (typeof plugin.before === "function") {
      beforeList.push({ name, plugin });
    }

    // 2. Cache help data
    if (plugin.help) {
      helpCache.push({
        name,
        help: Array.isArray(plugin.help) ? plugin.help : [plugin.help],
        tags: Array.isArray(plugin.tags) && plugin.tags.length
          ? plugin.tags
          : ["info"],
        owner: !!plugin.owner,
        mods: !!plugin.mods,
        admin: !!plugin.admin,
        limit: !!plugin.limit,
        premium: !!plugin.premium,
      });
    }

    // 3. Command indexing
    if (typeof plugin !== "function" || !plugin.command) continue;

    const cmds = Array.isArray(plugin.command)
      ? plugin.command
      : [plugin.command];

    for (const cmd of cmds) {
      if (!cmd) continue;

      if (cmd instanceof RegExp) {
        regexList.push({ name, plugin, regex: cmd });
      } else if (typeof cmd === "string") {
        const key = cmd.toLowerCase();
        if (index.has(key)) {
          duplicates.push({
            command: key,
            plugin1: index.get(key).name,
            plugin2: name,
          });
        } else {
          index.set(key, { name, plugin });
        }
      }
    }
  }

  global.commandIndex = index;
  global.regexPlugins = regexList;
  global.allPlugins = allList;
  global.beforePlugins = beforeList;
  global.helpCache = helpCache;

  if (duplicates.length) {
    for (const d of duplicates) {
      global.logger?.warn(d, "⚠️ Duplicate command");
    }
  }

  const stats = {
    stringCommands: index.size,
    regexCommands: regexList.length,
    allHooks: allList.length,
    beforeHooks: beforeList.length,
    totalPlugins,
  };

  global.logger?.info(stats, "📇 Command index built");
  return stats;
}