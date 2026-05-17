/**
 * @file Multi-provider file uploader module
 * @module lib/uploader
 * @license Apache-2.0
 * @author Naruya Izumi
 */

import { fileTypeFromBuffer } from "file-type";

/**
 * Basic headers
 */
const HEADERS = {
    "User-Agent": "Mozilla/5.0",
    Accept: "*/*",
};

/**
 * Max upload size
 * 200 MB
 */
const MAX_SIZE = 200 * 1024 * 1024;

/**
 * Logger helper
 */
function logError(logger, msg) {
    logger?.error?.(msg);
}

/**
 * Validate buffer
 */
function validateBuffer(buf) {
    if (!Buffer.isBuffer(buf)) {
        throw new Error("Input must be Buffer");
    }

    if (!buf.length) {
        throw new Error("Empty buffer");
    }

    if (buf.length > MAX_SIZE) {
        throw new Error("File too large");
    }
}

/**
 * Get safe file type
 */
async function getFileType(buf) {
    const type = await fileTypeFromBuffer(buf);

    return (
        type || {
            ext: "bin",
            mime: "application/octet-stream",
        }
    );
}

/**
 * Validate URL
 */
function validateUrl(url) {
    try {
        const parsed = new URL(url);

        if (!["http:", "https:"].includes(parsed.protocol)) {
            return false;
        }

        return true;
    } catch {
        return false;
    }
}

/**
 * Create blob form
 */
function createForm(field, buf, type) {
    const form = new FormData();

    const blob = new Blob([buf], {
        type: type.mime,
    });

    form.append(field, blob, `file.${type.ext}`);

    return form;
}

/**
 * Fetch JSON safely
 */
async function safeJson(res) {
    const text = await res.text();

    try {
        return JSON.parse(text);
    } catch {
        throw new Error(`Invalid JSON response: ${text.slice(0, 120)}`);
    }
}

/**
 * Catbox uploader
 */
async function uploader1(buf, logger = console) {
    validateBuffer(buf);

    const type = await getFileType(buf);

    const form = new FormData();

    form.append("reqtype", "fileupload");

    const blob = new Blob([buf], {
        type: type.mime,
    });

    form.append("fileToUpload", blob, `file.${type.ext}`);

    try {
        const res = await fetch("https://catbox.moe/user/api.php", {
            method: "POST",
            body: form,
            signal: AbortSignal.timeout(60000),
        });

        if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
        }

        const text = (await res.text()).trim();

        if (!validateUrl(text)) {
            throw new Error("Invalid response URL");
        }

        return text;
    } catch (e) {
        logError(logger, `Catbox: ${e.message}`);
        throw e;
    }
}

/**
 * Uguu uploader
 */
async function uploader2(buf, logger = console) {
    validateBuffer(buf);

    const type = await getFileType(buf);

    const form = createForm("files[]", buf, type);

    try {
        const res = await fetch("https://uguu.se/upload.php", {
            method: "POST",
            body: form,
            signal: AbortSignal.timeout(60000),
        });

        if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
        }

        const json = await safeJson(res);

        const url = json?.files?.[0]?.url;

        if (!validateUrl(url)) {
            throw new Error("Invalid response URL");
        }

        return url.trim();
    } catch (e) {
        logError(logger, `Uguu: ${e.message}`);
        throw e;
    }
}

/**
 * Qu.ax uploader
 */
async function uploader3(buf, logger = console) {
    validateBuffer(buf);

    const type = await getFileType(buf);

    const form = createForm("files[]", buf, type);

    try {
        const res = await fetch("https://qu.ax/upload.php", {
            method: "POST",
            body: form,
            signal: AbortSignal.timeout(60000),
        });

        if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
        }

        const json = await safeJson(res);

        if (!Array.isArray(json?.files)) {
            throw new Error("Invalid files array");
        }

        const url = json.files[0]?.url;

        if (!validateUrl(url)) {
            throw new Error("Invalid response URL");
        }

        return url.trim();
    } catch (e) {
        logError(logger, `Qu.ax: ${e.message}`);
        throw e;
    }
}

/**
 * Put.icu uploader
 */
async function uploader4(buf, logger = console) {
    validateBuffer(buf);

    const type = await getFileType(buf);

    try {
        const res = await fetch("https://put.icu/upload/", {
            method: "PUT",
            headers: {
                ...HEADERS,
                "Content-Type": type.mime,
            },
            body: buf,
            signal: AbortSignal.timeout(60000),
        });

        if (!res.ok) {
            const errText = await res.text();
            throw new Error(`HTTP ${res.status}: ${errText.slice(0, 100)}`);
        }

        const json = await safeJson(res);

        const url = json?.direct_url;

        if (!validateUrl(url)) {
            throw new Error("Invalid response URL");
        }

        return url.trim();
    } catch (e) {
        logError(logger, `Put.icu: ${e.message}`);
        throw e;
    }
}

/**
 * Tmpfiles uploader
 */
async function uploader5(buf, logger = console) {
    validateBuffer(buf);

    const type = await getFileType(buf);

    const form = createForm("file", buf, type);

    try {
        const res = await fetch("https://tmpfiles.org/api/v1/upload", {
            method: "POST",
            body: form,
            signal: AbortSignal.timeout(60000),
        });

        if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
        }

        const json = await safeJson(res);

        let url = json?.data?.url;

        if (!url) {
            throw new Error("Missing URL");
        }

        url = url.replace("/file/", "/dl/");

        if (!validateUrl(url)) {
            throw new Error("Invalid response URL");
        }

        return url.trim();
    } catch (e) {
        logError(logger, `Tmpfiles: ${e.message}`);
        throw e;
    }
}

/**
 * Videy uploader
 */
async function uploader6(buf, logger = console) {
    validateBuffer(buf);

    const type = await getFileType(buf);

    if (!type.mime.startsWith("video/")) {
        throw new Error("Need video");
    }

    const form = createForm("file", buf, type);

    form.append("apikey", "freeApikey");

    try {
        const res = await fetch("https://anabot.my.id/api/tools/videy", {
            method: "POST",
            body: form,
            signal: AbortSignal.timeout(60000),
        });

        if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
        }

        const json = await safeJson(res);

        const url = json?.data?.result?.link;

        if (!validateUrl(url)) {
            throw new Error("Invalid response URL");
        }

        return url.trim();
    } catch (e) {
        logError(logger, `Videy: ${e.message}`);
        throw e;
    }
}

/**
 * GoFile uploader
 */
async function uploader7(buf, logger = console) {
    validateBuffer(buf);

    const type = await getFileType(buf);

    if (!type.mime.startsWith("image/")) {
        throw new Error("Need image");
    }

    const form = createForm("file", buf, type);

    form.append("apikey", "freeApikey");

    try {
        const res = await fetch("https://anabot.my.id/api/tools/goFile", {
            method: "POST",
            body: form,
            signal: AbortSignal.timeout(60000),
        });

        if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
        }

        const json = await safeJson(res);

        const url = json?.data?.result?.imageUrl;

        if (!validateUrl(url)) {
            throw new Error("Invalid response URL");
        }

        return url.trim();
    } catch (e) {
        logError(logger, `GoFile: ${e.message}`);
        throw e;
    }
}

/**
 * Main uploader
 */
async function uploader(buf, logger = console) {
    validateBuffer(buf);

    const providers = [
       { name: "Qu.ax", fn: uploader3 },
       { name: "Catbox", fn: uploader1 },
       { name: "Uguu", fn: uploader2 },
       { name: "Put.icu", fn: uploader4 },
       { name: "Tmpfiles", fn: uploader5 },
   ];

    const attempts = [];

    const tasks = providers.map(async (prov) => {
        try {
            const url = await prov.fn(buf, logger);

            attempts.push({
                provider: prov.name,
                status: "success",
                url,
            });

            return {
                success: true,
                url,
                provider: prov.name,
                attempts,
            };
        } catch (e) {
            attempts.push({
                provider: prov.name,
                status: "error",
                error: e.message,
            });

            throw e;
        }
    });

    try {
        return await Promise.any(tasks);
    } catch {
        logError(logger, "All uploaders failed");

        return {
            success: false,
            url: null,
            provider: null,
            attempts,
        };
    }
}

export {
    uploader1,
    uploader2,
    uploader3,
    uploader4,
    uploader5,
    uploader6,
    uploader7,
    uploader,
};