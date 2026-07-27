// src/ai/optimizer.js
export async function optimizeContext(context, maxTokens = 4000) {
    if (!context || context.length === 0) {
        return context;
    }
    
    // Prioritaskan plugin yang relevan
    const prioritized = context.sort((a, b) => {
        // Plugin dengan command lebih tinggi priority
        if (a.command && !b.command) return -1;
        if (!a.command && b.command) return 1;
        return 0;
    });
    
    // Batasi size
    let totalSize = 0;
    const optimized = [];
    
    for (const item of prioritized) {
        const itemSize = JSON.stringify(item).length;
        if (totalSize + itemSize > maxTokens) break;
        optimized.push(item);
        totalSize += itemSize;
    }
    
    return optimized;
}