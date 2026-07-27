/**
 * @file AI Copilot Plugin
 * @description AI Assistant dengan file management dan context repository
 * @author Naruya Izumi
 */

import { generate } from "../../ai/engine.js";
import FileManagerAI from '../../ai/providers/fileManager.js';

// Inisialisasi fileManager untuk fallback
const fileManager = new FileManagerAI();

let handler = async (m, { conn, text }) => {
    if (!text) {
        return m.reply(
`*🤖 AI Copilot - Bot Assistant*

📌 *Perintah:*
.copilot <pertanyaan> - Tanya AI apapun
.copilot local <pertanyaan> - AI dengan context repository

📁 *File Management:*
.copilot list plugins - Lihat semua plugin
.copilot cari plugin <nama> - Cari plugin
.copilot info .<command> - Info plugin
.copilot jelaskan .<command> - Penjelasan fitur

🐛 *Debug & Analysis:*
.copilot bug di <file> - Cari bug di file
.copilot analisis <file> - Analisis kode
.copilot debug error <error> - Debug error

💡 *Contoh:*
.copilot list plugins
.copilot local jelaskan cara kerja .play
.copilot bug di ai-copilot.js
.copilot analisis src/handler.js`
        );
    }

    try {
        await global.loading(m, conn);

        // ========================================
        // DETEKSI MODE: public atau local
        // ========================================
        let mode = "public";
        let question = text;

        if (text.match(/^(local|-l|--local)\s/i)) {
            mode = "local";
            question = text.replace(/^(local|-l|--local)\s/i, "").trim();
        }

        // ========================================
        // DETEKSI: Apakah ini command file management?
        // ========================================
        let isFileManagerQuery = false;

        // CEK PERTAMA: Apakah ada kata "bug" + nama file?
        if (question.match(/bug.*(ai-copilot|downloader|sticker|play|ig|tiktok|youtube|spotify|rpg|game|tool|owner|group|info|maker|handler|config|index|main|\.js)/i)) {
            isFileManagerQuery = true;
            console.log(`[Copilot] Detected bug query with file`);
        }

        // CEK KEDUA: Apakah ada kata "error" + nama file?
        if (!isFileManagerQuery && question.match(/error.*(ai-copilot|downloader|sticker|play|ig|tiktok|youtube|spotify|rpg|game|tool|owner|group|info|maker|handler|config|index|main|\.js)/i)) {
            isFileManagerQuery = true;
            console.log(`[Copilot] Detected error query with file`);
        }

        // CEK KETIGA: Apakah ada kata kunci file management?
        if (!isFileManagerQuery) {
            const fileCommands = [
                'list', 'cari', 'search', 'find', 'temukan',
                'info', 'detail', 'tentang', 'about',
                'jelaskan', 'explain', 'bagaimana', 'cara',
                'debug', 'analisis', 'analyze', 'review', 'cek',
                'bug', 'error', 'problem', 'issue',
                'help', 'bantuan', 'tolong',
                'plugins', 'plugin', 'fitur', 'command'
            ];
            
            const firstWord = question.toLowerCase().split(/\s+/)[0];
            if (fileCommands.includes(firstWord)) {
                isFileManagerQuery = true;
            }
        }

        // CEK KEEMPAT: Pattern khusus
        if (!isFileManagerQuery) {
            const patterns = [
                /plugin|fitur|command|file|folder|struktur|repository|bot/i,
                /\.\w+/, // ada .command
                /error|bug|problem|issue|gagal/i,
                /list|daftar|show|lihat/i,
                /cari|search|find|temukan/i,
                /info|detail|tentang|about/i,
                /jelaskan|explain|bagaimana|cara kerja|apa itu/i,
                /analisis|analyze|review|cek|scan/i
            ];
            
            for (const pattern of patterns) {
                if (pattern.test(question)) {
                    isFileManagerQuery = true;
                    break;
                }
            }
        }

        // CEK KELIMA: Kecualikan pertanyaan umum
        if (isFileManagerQuery) {
            const generalQuestions = [
                /kamu siapa|siapa kamu|halo|hai|hello|hi/i,
                /apa itu (async|await|promise|callback|javascript|nodejs|bot|whatsapp)/i,
                /bagaimana cara (make|buat|install|setup)/i,
                /apa kabar|kabar|gimana|baik/i,
                /^apa itu$/i,
                /^bagaimana$/i,
                /^kenapa$/i
            ];
            
            for (const pattern of generalQuestions) {
                if (pattern.test(question)) {
                    isFileManagerQuery = false;
                    break;
                }
            }
        }

        // CEK KEENAM: Jika ada "local" dan pertanyaan tentang bot, paksa filemanager
        if (mode === "local" && !isFileManagerQuery) {
            const botKeywords = ['plugin', 'fitur', 'command', 'file', 'folder', 'struktur', 'repository', 'bot', 'code', 'kode', 'function', 'class', 'import', 'export', 'handler'];
            for (const keyword of botKeywords) {
                if (question.toLowerCase().includes(keyword)) {
                    isFileManagerQuery = true;
                    console.log(`[Copilot] Local mode with bot keyword: ${keyword}`);
                    break;
                }
            }
        }

        let provider = "copilot";
        let useFileManager = false;

        if (isFileManagerQuery) {
            provider = "filemanager";
            useFileManager = true;
            console.log(`[Copilot] Using FileManager for: ${question}`);
        } else {
            console.log(`[Copilot] Using Copilot API for: ${question}`);
        }

        console.log(`[Copilot] Provider: ${provider}, Mode: ${mode}, Question: ${question.slice(0, 50)}...`);

        let result;

        // ========================================
        // PANGGIL ENGINE
        // ========================================
        try {
            result = await generate({
                provider: provider,
                mode: mode,
                question: question
            });
        } catch (error) {
            console.warn('[Copilot] Engine error:', error.message);
            
            // Fallback: jika copilot error, coba filemanager
            if (provider === 'copilot' && !useFileManager) {
                console.log('[Copilot] Fallback to filemanager');
                try {
                    const fallbackResult = await fileManager.process(question);
                    result = typeof fallbackResult === 'string' ? fallbackResult : fallbackResult.message;
                } catch (fallbackError) {
                    console.error('[Copilot] Fallback failed:', fallbackError);
                    throw new Error('AI service unavailable. Please try again later.');
                }
            } else {
                throw error;
            }
        }

        // ========================================
        // KIRIM RESPONSE
        // ========================================
        if (result && typeof result === 'string') {
            await conn.sendMessage(
                m.chat,
                { text: result },
                { quoted: m }
            );
        } else {
            await conn.sendMessage(
                m.chat,
                { text: '❌ Tidak ada response dari AI' },
                { quoted: m }
            );
        }

    } catch (e) {
        console.error('Copilot Error:', e);
        
        let errorMsg = `❌ Error: ${e.message}`;
        
        if (e.message.includes('HTTP 500')) {
            errorMsg = `❌ AI service sedang bermasalah. Coba lagi nanti.\n\n` +
                       `💡 Gunakan perintah file management:\n` +
                       `.copilot list plugins\n` +
                       `.copilot cari plugin downloader\n` +
                       `.copilot info .play`;
        } else if (e.message.includes('timeout')) {
            errorMsg = `❌ Request timeout. Coba lagi nanti.`;
        } else if (e.message.includes('Question is required')) {
            errorMsg = `❌ Pertanyaan tidak boleh kosong.\n\n` +
                       `💡 Contoh:\n` +
                       `.copilot list plugins\n` +
                       `.copilot jelaskan .play`;
        }
        
        m.reply(errorMsg);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["copilot"];
handler.tags = ["ai", "owner"];
handler.command = /^copilot$/i;
handler.owner = true;

export default handler;