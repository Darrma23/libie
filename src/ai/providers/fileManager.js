/**
 * @file File Manager AI Provider
 * @module src/ai/providers/fileManager
 */

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildIndex, searchPlugins, getPluginInfo } from '../indexer.js';
import { readFile } from '../reader.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '../../..');

class FileManagerAI {
    constructor() {
        this.name = 'fileManager';
        this.version = '2.0.0';
        this.index = null;
    }

    async process(query) {
        if (!query || typeof query !== 'string') {
            return {
                success: false,
                message: '❌ Pertanyaan tidak valid.'
            };
        }

        // Load index jika belum
        if (!this.index) {
            try {
                this.index = await buildIndex();
                console.log(`[FileManager] Index loaded: ${this.index.plugins.length} plugins`);
            } catch (error) {
                console.error('[FileManager] Failed to load index:', error);
                return {
                    success: false,
                    message: `❌ Gagal load index: ${error.message}`
                };
            }
        }

        const intent = this.detectIntent(query);
        console.log(`[FileManager] Intent: ${intent}, Query: ${query.slice(0, 50)}...`);

        try {
            let result;
            switch (intent) {
                case 'list_plugins':
                    result = await this.listPlugins();
                    break;
                case 'search_plugin':
                    result = await this.searchPlugin(query);
                    break;
                case 'plugin_info':
                    result = await this.getPluginInfo(query);
                    break;
                case 'explain_feature':
                    result = await this.explainFeature(query);
                    break;
                case 'analyze_code':
                    result = await this.analyzeCode(query);
                    break;
                case 'find_bugs':
                    result = await this.findBugs(query);
                    break;
                case 'debug_error':
                    result = await this.debugError(query);
                    break;
                case 'help':
                    result = this.getHelp();
                    break;
                case 'general_question':
                    result = this.handleGeneralQuestion(query);
                    break;
                default:
                    result = this.handleUnknown(query);
            }

            // Pastikan return string
            if (typeof result === 'string') {
                return { success: true, message: result };
            }
            if (typeof result === 'object' && result !== null) {
                return result;
            }
            return { success: false, message: '❌ Invalid response from AI' };

        } catch (error) {
            console.error('[FileManager] Error:', error);
            return {
                success: false,
                message: `❌ Error: ${error.message}`
            };
        }
    }

    detectIntent(query) {
        const lower = query.toLowerCase();

        // ========================================
        // PRIORITAS 1: DETEKSI BUG/ERROR DENGAN FILE
        // ========================================
        // Jika ada kata "bug" dan ada nama file, langsung return find_bugs
        if (lower.includes('bug') &&
            (lower.match(/\.js|\w+\.js|ai-copilot|downloader|sticker|play|ig|tiktok|youtube|spotify|rpg|game|tool|owner|group|info|maker|handler|config|index|main/i) ||
                lower.match(/di\s+[\w./-]+|file\s+[\w./-]+/i))) {
            return 'find_bugs';
        }

        // Jika ada kata "error" dan ada nama file, return debug_error
        if (lower.includes('error') &&
            (lower.match(/\.js|\w+\.js|ai-copilot|downloader|sticker|play|ig|tiktok|youtube|spotify|rpg|game|tool|owner|group|info|maker|handler|config|index|main/i) ||
                lower.match(/di\s+[\w./-]+|file\s+[\w./-]+/i))) {
            return 'debug_error';
        }

        // ========================================
        // PRIORITAS 2: CEK PERTANYAAN UMUM
        // ========================================
        const generalQuestions = [
            /^apa itu (nodejs|javascript|bot|whatsapp|api|runtime|npm|express)/i,
            /^bagaimana cara (make|buat|install|setup|menggunakan|install|download)/i,
            /^(kamu siapa|siapa kamu|halo|hai|hello|hi|assalamualaikum|selamat pagi|selamat siang|selamat malam)$/i,
            /^(apa kabar|kabar|gimana|baik|sehat)$/i,
            /^(berita|news|cuaca|weather|hari ini|update)$/i,
            /^(terima kasih|makasih|thanks|thank you)$/i,
            /^apa itu$/i,
            /^bagaimana$/i,
            /^kenapa$/i
        ];

        for (const pattern of generalQuestions) {
            if (pattern.test(lower)) {
                return 'general_question';
            }
        }

        // ========================================
        // PRIORITAS 3: CEK PERINTAH FILE MANAGEMENT
        // ========================================

        // List plugins
        if (lower.match(/list|show|lihat|daftar|semua\s+plugin|plugins?$/i) ||
            lower.match(/berapa\s+(banyak|total|jumlah)\s+plugin/i) ||
            lower.match(/^plugins?$/i) ||
            lower.match(/^list$/i) ||
            lower.match(/daftar\s+plugin/i)) {
            return 'list_plugins';
        }

        // Search plugin
        if (lower.match(/cari|search|find|temukan\s+(plugin|file|command)/i) ||
            lower.match(/cari\s+\w+/i) ||
            lower.match(/search\s+\w+/i)) {
            return 'search_plugin';
        }

        // Info plugin
        if (lower.match(/info|detail|tentang|about\s+(plugin|command|\.)/i) ||
            lower.match(/tentang\s+\.\w+/i) ||
            lower.match(/info\s+\.\w+/i) ||
            lower.match(/^info\s+\w+/i)) {
            return 'plugin_info';
        }

        // Explain feature
        if (lower.match(/jelaskan|explain|bagaimana|cara kerja|apa itu|itu apa|fungsi|guna|manfaat|penjelasan/i)) {
            // Cek apakah ada nama file/command yang disebut
            if (lower.match(/\.\w+/) ||
                lower.match(/plugin|fitur|command|file|script|\w+\.js/i) ||
                lower.match(/ai-copilot|downloader|sticker|play|ig|tiktok|youtube|spotify|rpg|game|tool|owner|group|info|maker|exp|internet|islami/i)) {
                return 'explain_feature';
            }
            // Jika tidak ada, cek apakah pertanyaan tentang bot
            if (lower.match(/bot|this|ini|sistem|struktur|repository|folder|directory|project|code|kode/i)) {
                return 'explain_feature';
            }
            return 'general_question';
        }

        // Debug error (tanpa nama file spesifik)
        if (lower.match(/debug|error|masalah|problem|issue|gagal|tidak\s+bisa|ga\s+bisa|kenapa\s+(error|gagal)/i) &&
            !lower.match(/bug|ada\s+bug|cek\s+bug|find\s+bug/i)) {
            return 'debug_error';
        }

        // Find bugs (tanpa nama file spesifik)
        if (lower.match(/bug|bugs|cek\s+bug|scan\s+bug|find\s+bug|ada\s+bug|bug\s+di/i) &&
            !lower.match(/error/i)) {
            return 'find_bugs';
        }

        // Analyze code
        if (lower.match(/analisis|analyze|review|cek|scan\s+(file|kode|code|script)/i) ||
            lower.match(/analisis\s+[\w./-]+\.\w+/i) ||
            lower.match(/review\s+[\w./-]+\.\w+/i) ||
            lower.match(/cek\s+[\w./-]+\.\w+/i)) {
            return 'analyze_code';
        }

        // Help
        if (lower.match(/^(help|bantuan|tolong|panduan|guide|\?)$/i)) {
            return 'help';
        }

        // ========================================
        // PRIORITAS 4: FALLBACK DETEKSI KEYWORD
        // ========================================
        const keywords = {
            'list_plugins': ['list', 'daftar', 'semua plugin', 'plugins'],
            'search_plugin': ['cari', 'search', 'find', 'temukan'],
            'plugin_info': ['info', 'detail', 'tentang', 'about'],
            'explain_feature': ['jelaskan', 'cara kerja', 'bagaimana', 'fungsi', 'guna', 'manfaat'],
            'find_bugs': ['bug', 'problem', 'issue'],
            'analyze_code': ['analisis', 'review', 'cek']
        };

        for (const [intent, words] of Object.entries(keywords)) {
            for (const word of words) {
                if (lower.includes(word)) {
                    // Cek apakah ada nama plugin/file di query
                    if (lower.match(/\.\w+|\w+\.js|ai-copilot|downloader|sticker|play|ig|tiktok|youtube|spotify|rpg|game|tool|owner|group|info|maker|handler|config|index|main/i)) {
                        return intent;
                    }
                }
            }
        }

        // ========================================
        // PRIORITAS 5: DETEKSI KONTEKS
        // ========================================
        // Jika ada kata "plugin" atau "fitur", anggap explain
        if (lower.includes('plugin') || lower.includes('fitur') || lower.includes('command')) {
            return 'explain_feature';
        }

        // Jika ada kata "file" atau ".js", anggap analyze
        if (lower.includes('file') || lower.includes('.js') || lower.includes('/')) {
            return 'analyze_code';
        }

        // Jika bertanya tentang bot
        if (lower.includes('bot') || lower.includes('sistem') || lower.includes('struktur') ||
            lower.includes('repository') || lower.includes('project') || lower.includes('code')) {
            return 'explain_feature';
        }

        return 'unknown';
    }

    handleGeneralQuestion(query) {
        return `🤖 *Pertanyaan Umum*\n\n` +
            `Untuk pertanyaan seperti "${query}", saya sarankan:\n\n` +
            `📌 *Gunakan mode public (tanpa local):*\n` +
            `.copilot ${query}\n\n` +
            `📌 *Atau tanya spesifik tentang bot:*\n` +
            `• .copilot jelaskan .play\n` +
            `• .copilot cari plugin downloader\n` +
            `• .copilot list plugins\n` +
            `• .copilot bug di ai-copilot.js\n\n` +
            `💡 *Tips:* Gunakan "local" untuk pertanyaan tentang kode bot, dan tanpa "local" untuk pertanyaan umum.`;
    }

    async listPlugins() {
        const plugins = this.index.plugins;

        let message = `📁 *Daftar Plugin Bot*\n\n`;
        message += `📊 Total: ${plugins.length} plugin\n\n`;

        // Group by tags
        const byTag = {};
        plugins.forEach(p => {
            if (p.tags) {
                p.tags.forEach(tag => {
                    if (!byTag[tag]) byTag[tag] = [];
                    byTag[tag].push(p);
                });
            }
        });

        const sortedTags = Object.entries(byTag)
            .sort((a, b) => b[1].length - a[1].length)
            .slice(0, 10);

        message += `📂 *Kategori:*\n`;
        sortedTags.forEach(([tag, plugins]) => {
            message += `   🏷️ ${tag}: ${plugins.length} plugin\n`;
        });

        message += `\n📌 *Contoh plugin:*\n`;
        plugins.slice(0, 10).forEach(p => {
            const cmd = Array.isArray(p.command) ? p.command[0] : p.command;
            const help = p.help || 'No description';
            message += `   🔹 ${cmd} - ${help}\n`;
        });

        if (plugins.length > 10) {
            message += `\n... dan ${plugins.length - 10} plugin lainnya`;
        }

        return message;
    }

    async searchPlugin(query) {
        // Extract search term
        let searchTerm = null;

        let match = query.match(/(?:cari|search|find|temukan)\s+(?:plugin\s+)?['"]?([^'"]+)['"]?/i);
        if (match) searchTerm = match[1];

        if (!searchTerm) {
            match = query.match(/cari\s+['"]?([^'"]+)['"]?/i);
            if (match) searchTerm = match[1];
        }

        if (!searchTerm) {
            match = query.match(/plugin\s+['"]?([^'"]+)['"]?/i);
            if (match) searchTerm = match[1];
        }

        if (!searchTerm) {
            const words = query.split(/\s+/);
            const skipWords = ['cari', 'search', 'find', 'temukan', 'plugin'];
            for (const word of words) {
                if (!skipWords.includes(word.toLowerCase()) && word.length > 1) {
                    searchTerm = word;
                    break;
                }
            }
        }

        if (!searchTerm) {
            return '❌ Apa yang mau dicari? Contoh: "cari plugin downloader"';
        }

        console.log(`[FileManager] Searching: "${searchTerm}"`);

        const results = await searchPlugins(searchTerm);

        if (results.length === 0) {
            return `🔍 Tidak ditemukan plugin untuk: "${searchTerm}"`;
        }

        let message = `🔍 *Hasil Pencarian: "${searchTerm}"*\n\n`;

        // Unique plugins
        const unique = new Map();
        results.forEach(r => {
            const key = r.plugin.path;
            if (!unique.has(key)) {
                unique.set(key, {
                    plugin: r.plugin,
                    types: [r.type],
                    details: r.type === 'command' ? r.cmd :
                        r.type === 'help' ? r.help :
                            r.type === 'tag' ? r.tag : ''
                });
            } else {
                const existing = unique.get(key);
                if (!existing.types.includes(r.type)) {
                    existing.types.push(r.type);
                }
            }
        });

        const uniqueResults = Array.from(unique.values()).slice(0, 15);

        uniqueResults.forEach(({ plugin, types, details }) => {
            const cmd = Array.isArray(plugin.command) ? plugin.command[0] : plugin.command;
            const help = plugin.help || 'Tidak ada deskripsi';

            message += `📌 *${cmd}*\n`;
            message += `   └ ${help}\n`;

            const typeLabels = types.map(t => {
                switch (t) {
                    case 'command': return '⚡ command';
                    case 'help': return '📝 help';
                    case 'tag': return '🏷️ tag';
                    default: return t;
                }
            });
            message += `   └ Match: ${typeLabels.join(', ')}\n`;
            message += '\n';
        });

        if (unique.size > 15) {
            message += `\n... dan ${unique.size - 15} hasil lainnya`;
        }

        return message;
    }

    async getPluginInfo(query) {
        let command = null;

        let match = query.match(/\.(\w+)/);
        if (match) command = match[1];

        if (!command) {
            match = query.match(/(?:info|plugin|command|fitur|tentang)\s+['"]?([\w.-]+)['"]?/i);
            if (match) command = match[1];
        }

        if (!command) {
            const words = query.split(/\s+/);
            for (const word of words) {
                if (['info', 'plugin', 'command', 'fitur', 'about', 'tentang', 'detail'].includes(word.toLowerCase())) {
                    continue;
                }
                if (word.length > 2) {
                    command = word;
                    break;
                }
            }
        }

        if (!command) {
            return '❌ Plugin apa? Contoh: "info .play" atau "info play"';
        }

        const plugin = await getPluginInfo(command);

        if (!plugin) {
            return `❌ Plugin "${command}" tidak ditemukan`;
        }

        let message = `📖 *Info Plugin: ${command}*\n\n`;
        message += `📝 *Deskripsi:* ${plugin.help || 'Tidak ada deskripsi'}\n`;
        message += `🏷️ *Tags:* ${plugin.tags?.join(', ') || 'Tidak ada tag'}\n`;
        message += `📂 *File:* ${plugin.path}\n`;

        const cmds = Array.isArray(plugin.command) ? plugin.command : [plugin.command];
        message += `⚡ *Commands:* ${cmds.join(', ')}\n`;

        if (plugin.symbols && plugin.symbols.imports && plugin.symbols.imports.length > 0) {
            message += `\n📦 *Imports:*\n`;
            plugin.symbols.imports.slice(0, 5).forEach(imp => {
                message += `   └ ${imp}\n`;
            });
            if (plugin.symbols.imports.length > 5) {
                message += `   └ ... dan ${plugin.symbols.imports.length - 5} lainnya\n`;
            }
        }

        message += `\n💡 *Usage:*\n`;
        message += `   ${cmds[0]} <args>\n`;
        message += `   Contoh: ${cmds[0]} help\n`;

        return message;
    }

    async explainFeature(query) {
        let command = null;

        // Pola 1: .command
        let match = query.match(/\.(\w+)/);
        if (match) command = match[1];

        // Pola 2: "fitur X" atau "command X"
        if (!command) {
            match = query.match(/(?:fitur|plugin|command|feature)\s+['"]?([\w.-]+)['"]?/i);
            if (match) command = match[1];
        }

        // Pola 3: "jelaskan X"
        if (!command) {
            match = query.match(/jelaskan\s+['"]?([\w.-]+)['"]?/i);
            if (match) command = match[1];
        }

        // Pola 4: "cara kerja X"
        if (!command) {
            match = query.match(/cara kerja\s+['"]?([\w.-]+)['"]?/i);
            if (match) command = match[1];
        }

        // Pola 5: "apa itu X"
        if (!command) {
            match = query.match(/apa itu\s+['"]?([\w.-]+)['"]?/i);
            if (match) command = match[1];
        }

        // Pola 6: Ambil kata setelah "jelaskan" atau "explain"
        if (!command) {
            const words = query.split(/\s+/);
            for (let i = 0; i < words.length; i++) {
                if (['jelaskan', 'explain', 'fitur', 'plugin'].includes(words[i].toLowerCase())) {
                    if (i + 1 < words.length) {
                        const potential = words[i + 1];
                        if (!['ini', 'itu', 'yang', 'di', 'ke', 'pada'].includes(potential.toLowerCase())) {
                            command = potential;
                            break;
                        }
                    }
                }
            }
        }

        // Pola 7: Ambil kata yang mengandung .js atau nama plugin
        if (!command) {
            const words = query.split(/\s+/);
            for (const word of words) {
                if (word.includes('.js') ||
                    word.includes('ai-copilot') ||
                    word.includes('downloader') ||
                    word.includes('sticker') ||
                    word.includes('plugin') ||
                    word.match(/^(play|ig|tiktok|youtube|spotify|rpg|game|tool|owner|group|info|maker|exp|internet|islami|ai|downloader|maker)$/i)) {
                    command = word.replace(/[^a-zA-Z0-9._-]/g, '');
                    break;
                }
            }
        }

        if (!command) {
            return '❌ Fitur apa yang mau dijelaskan?\n\nContoh:\n• .copilot jelaskan .play\n• .copilot jelaskan fitur sticker\n• .copilot cara kerja ai-copilot.js';
        }

        // Cari plugin
        let plugin = await getPluginInfo(command);

        if (!plugin) {
            // Cari berdasarkan file name
            for (const p of this.index.plugins) {
                const fileName = p.path.split('/').pop().replace('.js', '');
                if (fileName.toLowerCase().includes(command.toLowerCase()) ||
                    command.toLowerCase().includes(fileName.toLowerCase())) {
                    plugin = p;
                    break;
                }
            }
        }

        if (!plugin) {
            return `❌ Fitur "${command}" tidak ditemukan.\n\n💡 Coba: .copilot cari ${command}`;
        }

        return await this.generateExplanation(command, plugin);
    }

    async generateExplanation(command, plugin) {
        const filePath = path.join(rootDir, plugin.path);
        let content = '';
        try {
            content = await readFile(filePath);
        } catch (e) {
            content = '';
        }

        let message = `📖 *Penjelasan: ${command}*\n\n`;

        message += `📝 *Deskripsi:*\n${plugin.help || 'Tidak ada deskripsi'}\n\n`;

        const cmds = Array.isArray(plugin.command) ? plugin.command : [plugin.command];
        message += `⚡ *Command:* ${cmds.join(', ')}\n\n`;

        if (plugin.tags && plugin.tags.length > 0) {
            message += `🏷️ *Kategori:* ${plugin.tags.join(', ')}\n\n`;
        }

        message += `📂 *File:* ${plugin.path}\n\n`;

        if (content && content.length > 50) {
            message += `⚡ *Cara Kerja:*\n`;

            const lines = content.split('\n');
            const steps = [];
            let inHandler = false;

            for (const line of lines) {
                const trimmed = line.trim();

                if (trimmed.includes('handler') && trimmed.includes('=')) {
                    inHandler = true;
                }

                if (inHandler) {
                    if (trimmed.includes('await') && !steps.includes('🔹 Melakukan operasi async')) {
                        steps.push('🔹 Melakukan operasi async');
                    }
                    if ((trimmed.includes('sendMessage') || trimmed.includes('reply')) && !steps.includes('🔹 Mengirim response ke user')) {
                        steps.push('🔹 Mengirim response ke user');
                    }
                    if ((trimmed.includes('try') && trimmed.includes('catch')) && !steps.includes('🔹 Error handling dengan try-catch')) {
                        steps.push('🔹 Error handling dengan try-catch');
                    }
                    if ((trimmed.includes('fetch') || trimmed.includes('axios')) && !steps.includes('🔹 Request ke API eksternal')) {
                        steps.push('🔹 Request ke API eksternal');
                    }
                    if ((trimmed.includes('fs.') || trimmed.includes('readFile')) && !steps.includes('🔹 Operasi file system')) {
                        steps.push('🔹 Operasi file system');
                    }
                }
            }

            if (steps.length > 0) {
                steps.slice(0, 5).forEach(step => {
                    message += `${step}\n`;
                });
                if (steps.length > 5) {
                    message += `🔹 ... dan lainnya\n`;
                }
            } else {
                message += '🔹 Menerima input dari user\n';
                message += '🔹 Memproses command\n';
                message += '🔹 Mengirim response\n';
            }
            message += '\n';
        }

        message += `💡 *Contoh Penggunaan:*\n`;
        message += `   ${cmds[0]} [args]\n`;
        message += `   ${cmds[0]} help (untuk bantuan)\n`;

        return message;
    }

    async analyzeCode(query) {
        // Extract filename dari berbagai format
        let filename = null;

        let match = query.match(/(?:file|analisis|analyze|review|cek)\s+['"]?([\w./-]+\.\w+)['"]?/i);
        if (match) filename = match[1];

        if (!filename) {
            match = query.match(/(?:file|analisis|analyze|review|cek)\s+([\w./-]+)/i);
            if (match) filename = match[1];
        }

        if (!filename) {
            // Ambil kata yang mengandung .js atau path
            const words = query.split(/\s+/);
            for (const word of words) {
                if (word.includes('.js') || word.includes('/') || word.includes('src/')) {
                    filename = word.replace(/[^a-zA-Z0-9./_-]/g, '');
                    break;
                }
            }
        }

        if (!filename) {
            return '❌ File apa? Contoh: "analisis src/handler.js"';
        }

        // Coba cari file
        let filePath = path.join(rootDir, filename);
        if (!await fs.pathExists(filePath)) {
            // Coba cari di src/
            const srcPath = path.join(rootDir, 'src', filename);
            if (await fs.pathExists(srcPath)) {
                filePath = srcPath;
            } else {
                // Coba cari di index
                let found = false;
                for (const plugin of this.index.plugins) {
                    const name = plugin.path.split('/').pop();
                    if (name.toLowerCase().includes(filename.toLowerCase()) ||
                        filename.toLowerCase().includes(name.toLowerCase().replace('.js', ''))) {
                        filePath = path.join(rootDir, plugin.path);
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    return `❌ File tidak ditemukan: ${filename}`;
                }
            }
        }

        const content = await readFile(filePath);
        const lines = content.split('\n');

        const stats = {
            lines: lines.length,
            chars: content.length,
            functions: (content.match(/function\s+\w+/g) || []).length,
            classes: (content.match(/class\s+\w+/g) || []).length,
            imports: (content.match(/import\s+.+from\s+.+/g) || []).length,
            asyncs: (content.match(/async/g) || []).length,
            awaits: (content.match(/await/g) || []).length,
            consoleLogs: (content.match(/console\.log/g) || []).length,
            exports: (content.match(/export\s+/g) || []).length,
            comments: (content.match(/\/\/.*|\/\*[\s\S]*?\*\//g) || []).length
        };

        let message = `🧠 *Analisis Kode: ${filename}*\n\n`;
        message += `📊 Lines: ${stats.lines}\n`;
        message += `📝 Characters: ${stats.chars}\n`;
        message += `⚡ Functions: ${stats.functions}\n`;
        message += `🏗️ Classes: ${stats.classes}\n`;
        message += `📦 Imports: ${stats.imports}\n`;
        message += `📤 Exports: ${stats.exports}\n`;
        message += `🔄 Async/Await: ${stats.asyncs}/${stats.awaits}\n`;
        message += `💬 Comments: ${stats.comments}\n`;
        message += `🖨️ Console.log: ${stats.consoleLogs}\n\n`;

        const complexity = stats.lines > 500 ? '⚠️ Complex' :
            stats.lines > 200 ? '📊 Medium' : '✅ Simple';
        message += `📈 Complexity: ${complexity}\n`;

        const suggestions = [];
        if (stats.functions > 20) suggestions.push('💡 Bagi fungsi ke file terpisah');
        if (stats.asyncs > 0 && stats.awaits === 0) suggestions.push('⚠️ Ada async tanpa await');
        if (stats.consoleLogs > 5) suggestions.push('💡 Hapus console.log di production');
        if (stats.comments < stats.lines * 0.05) suggestions.push('💡 Tambahkan komentar untuk dokumentasi');
        if (stats.imports > 15) suggestions.push('💡 Pertimbangkan untuk mengurangi import yang tidak perlu');

        if (suggestions.length > 0) {
            message += `\n💡 *Saran:*\n`;
            suggestions.forEach(s => message += `${s}\n`);
        }

        return message;
    }

    async findBugs(query) {
        // Extract filename dari berbagai format
        let filename = null;

        // Pola 1: "bug di X.js"
        let match = query.match(/(?:bug|error|problem)\s+(?:di|pada|di file)\s+['"]?([\w./-]+\.\w+)['"]?/i);
        if (match) filename = match[1];

        // Pola 2: "ada bug di X"
        if (!filename) {
            match = query.match(/ada\s+bug\s+(?:di|pada)\s+['"]?([\w./-]+)['"]?/i);
            if (match) filename = match[1];
        }

        // Pola 3: "X.js ada bug?"
        if (!filename) {
            match = query.match(/([\w./-]+\.js)\s+(?:ada\s+bug|bug|error)/i);
            if (match) filename = match[1];
        }

        // Pola 4: "cek bug di X"
        if (!filename) {
            match = query.match(/cek\s+bug\s+(?:di|pada)\s+['"]?([\w./-]+)['"]?/i);
            if (match) filename = match[1];
        }

        // Pola 5: "bug X"
        if (!filename) {
            match = query.match(/bug\s+['"]?([\w./-]+\.\w+)['"]?/i);
            if (match) filename = match[1];
        }

        // Pola 6: "scan bug X"
        if (!filename) {
            match = query.match(/scan\s+bug\s+['"]?([\w./-]+)['"]?/i);
            if (match) filename = match[1];
        }

        // Pola 7: "apa ada bug di X?"
        if (!filename) {
            match = query.match(/apa\s+ada\s+bug\s+(?:di|pada)\s+['"]?([\w./-]+)['"]?/i);
            if (match) filename = match[1];
        }

        // Pola 8: ambil kata yang mengandung .js
        if (!filename) {
            const words = query.split(/\s+/);
            for (const word of words) {
                if (word.includes('.js') || word.includes('ai-copilot') || word.includes('downloader') ||
                    word.includes('sticker') || word.includes('handler') || word.includes('config') ||
                    word.includes('index') || word.includes('main') || word.includes('plugin')) {
                    filename = word.replace(/[^a-zA-Z0-9._-]/g, '');
                    break;
                }
            }
        }

        // Pola 9: cari di index berdasarkan nama
        if (!filename) {
            const words = query.split(/\s+/);
            for (const word of words) {
                if (word.length > 3 && !['di', 'pada', 'file', 'bug', 'ada', 'cek', 'scan', 'apa', 'ada'].includes(word.toLowerCase())) {
                    // Cek di index
                    for (const plugin of this.index.plugins) {
                        const name = plugin.path.split('/').pop().replace('.js', '');
                        if (name.toLowerCase().includes(word.toLowerCase()) ||
                            word.toLowerCase().includes(name.toLowerCase())) {
                            filename = name + '.js';
                            break;
                        }
                    }
                    if (filename) break;
                }
            }
        }

        if (!filename) {
            return '❌ File apa yang mau dicek bug-nya?\n\nContoh:\n• .copilot bug di ai-copilot.js\n• .copilot ada bug di handler.js?\n• .copilot cek bug downloader-play.js';
        }

        // Coba cari file
        let filePath = path.join(rootDir, filename);
        if (!await fs.pathExists(filePath)) {
            // Coba cari di plugins
            const pluginPath = `src/plugins/${filename}`;
            filePath = path.join(rootDir, pluginPath);
            if (!await fs.pathExists(filePath)) {
                // Coba cari di index
                let found = false;
                for (const plugin of this.index.plugins) {
                    const name = plugin.path.split('/').pop();
                    if (name.toLowerCase().includes(filename.toLowerCase()) ||
                        filename.toLowerCase().includes(name.toLowerCase().replace('.js', ''))) {
                        filePath = path.join(rootDir, plugin.path);
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    return `❌ File tidak ditemukan: ${filename}`;
                }
            }
        }

        const content = await readFile(filePath);
        const lines = content.split('\n');
        const bugs = [];

        lines.forEach((line, i) => {
            const num = i + 1;

            if (line.includes('undefined') && !line.includes('typeof')) {
                bugs.push(`⚠️ Line ${num}: Kemungkinan undefined variable`);
            }
            if (line.includes('console.log') && !line.includes('//')) {
                bugs.push(`ℹ️ Line ${num}: Console.log di production`);
            }
            if (line.match(/password\s*=\s*['"][^'"]+['"]/i) || line.match(/token\s*=\s*['"][^'"]+['"]/i)) {
                bugs.push(`🔒 Line ${num}: Hardcoded credentials!`);
            }
            if (line.includes('try') && !line.includes('catch')) {
                bugs.push(`⚠️ Line ${num}: Try tanpa catch`);
            }
            if (line.includes('eval(')) {
                bugs.push(`⚠️ Line ${num}: Eval (security risk)`);
            }
            if (line.includes('await') && !line.includes('async')) {
                bugs.push(`⚠️ Line ${num}: Await tanpa async`);
            }
            if (line.includes('throw') && !line.includes('Error')) {
                bugs.push(`ℹ️ Line ${num}: Throw tanpa Error object`);
            }
            if (line.match(/\.then\(.*\)\s*\.catch/g)) {
                bugs.push(`ℹ️ Line ${num}: Bisa pakai async/await`);
            }
            if (line.match(/console\.log/g) && !line.includes('//')) {
                bugs.push(`ℹ️ Line ${num}: Console.log di production`);
            }
            if (line.includes('process.env') && !line.includes('||')) {
                bugs.push(`ℹ️ Line ${num}: Environment variable tanpa fallback`);
            }
        });

        if (bugs.length === 0) {
            return `✅ Tidak ditemukan bug di ${filename}`;
        }

        let message = `🐛 *Bug Report: ${filename}*\n\n`;
        bugs.slice(0, 15).forEach(bug => {
            message += `${bug}\n`;
        });

        if (bugs.length > 15) {
            message += `\n... dan ${bugs.length - 15} issue lainnya`;
        }

        return message;
    }

    async debugError(query) {
        const errorMatch = query.match(/error\s*[:=]?\s*['"]?([^'"]+)['"]?/i) ||
            query.match(/error\s+([^\s,.]+)/i);

        let message = `🔍 *Debug Error*\n\n`;

        if (errorMatch) {
            const errorText = errorMatch[1];
            message += `📌 *Error:* ${errorText}\n\n`;

            const suggestions = {
                'ECONNREFUSED': '💡 Cek koneksi internet, pastikan API endpoint aktif',
                'ENOENT': '💡 File tidak ditemukan, cek path file',
                'EACCES': '💡 Permission denied, jalankan dengan sudo atau chmod',
                'EADDRINUSE': '💡 Port sudah digunakan, ganti port di config',
                'ETIMEDOUT': '💡 Request timeout, cek koneksi atau tambah timeout',
                'timeout': '💡 Request timeout, cek koneksi atau tambah timeout',
                '429': '💡 Rate limit, tunggu beberapa saat atau upgrade API key',
                'auth': '💡 Auth error, cek API key atau login ulang',
                '403': '💡 Forbidden, cek permission atau API key',
                '404': '💡 Endpoint tidak ditemukan, cek URL API',
                '500': '💡 Internal server error, coba lagi nanti atau cek API status'
            };

            let found = false;
            for (const [pattern, suggestion] of Object.entries(suggestions)) {
                if (errorText.toLowerCase().includes(pattern.toLowerCase())) {
                    message += `${suggestion}\n\n`;
                    found = true;
                    break;
                }
            }

            if (!found) {
                message += `💡 *Saran Umum:*\n`;
                message += `1. Cek log error di terminal untuk detail\n`;
                message += `2. Restart bot: npm start\n`;
                message += `3. Cek dependency: npm install\n`;
                message += `4. Cek config.js untuk setting yang benar\n`;
            }
        } else {
            message += `❌ Error tidak ditemukan dalam query.\n`;
            message += `Contoh: "debug error ECONNREFUSED" atau "debug error 500"\n`;
        }

        return message;
    }

    getHelp() {
        return `🤖 *AI File Manager - Bantuan Lengkap*

📌 *Perintah yang didukung:*

📁 *List Plugins*
"list plugins" - Lihat semua plugin
"daftar plugin" - Sama seperti di atas
"berapa total plugin" - Hitung jumlah plugin

🔍 *Search Plugin*
"cari plugin downloader" - Cari plugin
"search play" - Cari command play
"temukan sticker" - Cari plugin sticker

📖 *Info Plugin*
"info .play" - Info detail plugin
"tentang .sticker" - Info plugin sticker
"detail play" - Info tanpa titik

📝 *Explain Feature*
"jelaskan .play" - Penjelasan fitur
"cara kerja .ig" - Cara kerja fitur
"apa itu sticker" - Penjelasan sederhana

🐛 *Debug Error*
"debug error ECONNREFUSED" - Debug error
"error 500" - Debug error code

🧠 *Analyze Code*
"analisis src/handler.js" - Analisis kode
"review ai-copilot.js" - Review kode

🔎 *Find Bugs*
"bug di handler.js" - Cari bug di file
"ada bug di ai-copilot.js?" - Cek bug
"cek bug downloader-play.js" - Scan bug

💡 *Contoh Penggunaan:*
.copilot list plugins
.copilot cari plugin downloader
.copilot info .play
.copilot jelaskan cara kerja .ig
.copilot bug di handler.js
.copilot analisis src/config.js

📌 *Tips:*
• Gunakan "local" untuk pertanyaan tentang kode bot
• Tanpa "local" untuk pertanyaan umum
• .copilot help - Tampilkan bantuan ini`;
    }

    handleUnknown(query) {
        // Coba deteksi apakah ada kata kunci bot
        const botKeywords = ['plugin', 'fitur', 'command', 'bot', 'file', 'folder', 'struktur', 'repository', 'code', 'kode', 'function', 'class', 'import', 'export', 'handler'];
        let hasBotKeyword = false;
        for (const keyword of botKeywords) {
            if (query.toLowerCase().includes(keyword)) {
                hasBotKeyword = true;
                break;
            }
        }

        if (hasBotKeyword) {
            return `❌ Saya tidak mengerti pertanyaan tentang bot: "${query}"\n\n` +
                `💡 Coba salah satu format ini:\n` +
                `• .copilot list plugins - Lihat semua plugin\n` +
                `• .copilot cari plugin downloader - Cari plugin\n` +
                `• .copilot info .play - Info plugin\n` +
                `• .copilot jelaskan .play - Penjelasan fitur\n` +
                `• .copilot bug di handler.js - Cari bug\n\n` +
                `📌 Atau ketik .copilot help untuk bantuan lengkap`;
        }

        return `❌ Saya tidak mengerti: "${query}"\n\n` +
            `💡 Coba perintah berikut:\n` +
            `📁 list plugins - Lihat semua plugin\n` +
            `🔍 cari plugin downloader - Cari plugin\n` +
            `📖 info .play - Info plugin\n` +
            `📝 jelaskan .play - Penjelasan fitur\n` +
            `🐛 bug di handler.js - Cari bug\n` +
            `🧠 analisis src/handler.js - Analisis kode\n\n` +
            `📌 Ketik .copilot help untuk bantuan lengkap`;
    }
}

export default FileManagerAI;