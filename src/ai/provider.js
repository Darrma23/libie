// src/ai/provider.js
/**
 * @file AI Provider
 * @module src/ai/provider
 */

// Import FileManager AI
import FileManagerAI from './providers/fileManager.js';

// Inisialisasi
const fileManagerAI = new FileManagerAI();

const provider = {
    /**
     * Microsoft Copilot
     * @param {string} prompt
     * @returns {Promise<string>}
     */
    async copilot(prompt) {
        if (!prompt) {
            throw new Error('Prompt is required');
        }
        
        console.log('[Provider] Copilot request:', prompt.slice(0, 100) + '...');
        
        // Coba beberapa endpoint
        const endpoints = [
            `https://api.yupra.my.id/api/ai/copilot-think?text=${encodeURIComponent(prompt)}`,
            `https://api.akuari.my.id/api/ai/copilot?text=${encodeURIComponent(prompt)}`,
            `https://api.itsrose.site/api/ai/copilot?text=${encodeURIComponent(prompt)}`
        ];
        
        let lastError = null;
        
        for (const url of endpoints) {
            try {
                console.log('[Provider] Trying endpoint:', url.split('?')[0]);
                
                const res = await fetch(url, {
                    headers: {
                        "User-Agent": "Mozilla/5.0 (Libie Bot)",
                        "Accept": "application/json"
                    },
                    timeout: 30000 // 30 detik timeout
                });

                if (!res.ok) {
                    throw new Error(`HTTP ${res.status}`);
                }

                const json = await res.json();

                // Cek berbagai format response
                let result = null;
                
                // Format 1: { status: true, result: "text" }
                if (json?.status === true && json?.result) {
                    result = json.result;
                }
                // Format 2: { success: true, data: "text" }
                else if (json?.success === true && json?.data) {
                    result = json.data;
                }
                // Format 3: { response: "text" }
                else if (json?.response) {
                    result = json.response;
                }
                // Format 4: langsung string
                else if (typeof json === 'string') {
                    result = json;
                }
                // Format 5: { message: "text" }
                else if (json?.message) {
                    result = json.message;
                }
                
                if (result) {
                    const trimmed = result.trim();
                    if (trimmed && trimmed.length > 0) {
                        console.log('[Provider] Copilot success');
                        return trimmed;
                    }
                }
                
                throw new Error('Empty response from API');
                
            } catch (error) {
                console.warn('[Provider] Endpoint failed:', error.message);
                lastError = error;
                continue; // Coba endpoint berikutnya
            }
        }
        
        // Semua endpoint gagal
        console.error('[Provider] All endpoints failed');
        throw lastError || new Error('All Copilot endpoints failed');
    },

    /**
     * OpenAI
     */
    async openai(prompt) {
        throw new Error("OpenAI provider belum dibuat.");
    },

    /**
     * Gemini
     */
    async gemini(prompt) {
        throw new Error("Gemini provider belum dibuat.");
    },

    /**
     * DeepSeek
     */
    async deepseek(prompt) {
        throw new Error("DeepSeek provider belum dibuat.");
    },

    /**
     * File Manager AI - Local AI untuk manage file & plugin
     * @param {string} prompt
     * @returns {Promise<string>}
     */
    async filemanager(prompt) {
        if (!prompt) {
            throw new Error('Prompt is required');
        }
        
        console.log('[Provider] FileManager request:', prompt);
        
        try {
            const result = await fileManagerAI.process(prompt);
            
            if (typeof result === 'string') {
                return result;
            }
            
            if (result && typeof result === 'object') {
                return result.message || JSON.stringify(result);
            }
            
            return '❌ Tidak ada response dari FileManager';
            
        } catch (error) {
            console.error('[Provider] FileManager Error:', error);
            return `❌ Error: ${error.message}`;
        }
    }
};

/**
 * Generate AI response.
 *
 * @param {string} name - Provider name
 * @param {string} prompt - User prompt
 * @returns {Promise<string>}
 */
export async function generate(name, prompt) {
    if (!name) {
        throw new Error('Provider name is required');
    }
    
    if (!prompt) {
        throw new Error('Prompt is required');
    }
    
    const fn = provider[name];

    if (!fn) {
        throw new Error(`Unknown provider: ${name}`);
    }

    try {
        return await fn(prompt);
    } catch (error) {
        console.error(`[Provider] ${name} error:`, error);
        
        // Fallback: coba filemanager untuk pertanyaan tentang bot
        if (name === 'copilot' && error.message.includes('HTTP 500')) {
            console.log('[Provider] Fallback to filemanager for bot-related question');
            try {
                const fallbackResult = await provider.filemanager(prompt);
                return fallbackResult;
            } catch (fallbackError) {
                console.error('[Provider] Fallback failed:', fallbackError);
            }
        }
        
        throw error;
    }
}

export default provider;