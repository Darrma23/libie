import axios from "axios";
import dns from "dns/promises";
import tls from "tls";
import { URL } from "url";

// Cache dengan TTL 10 menit
const cache = new Map();
const CACHE_TTL = 10 * 60 * 1000;

// Handler utama
let handler = async (m, { args }) => {
  if (!args[0]) {
    return m.reply(
      "Contoh:\n.security google.com"
    );
  }

  await global.loading(m, conn);

  let domain = args[0]
    .replace(/^https?:\/\//, "")
    .split("/")[0]
    .trim();

  // Cek cache
  const cached = cache.get(domain);
  if (cached && Date.now() - cached.time < CACHE_TTL) {
    await global.loading(m, conn, true);
    return m.reply(cached.result);
  }

  // Inisialisasi variabel
  let finalUrl = `https://${domain}`;
  let score = 100;
  let risks = [];
  let findings = [];
  let recommendations = [];

  // Flag
  let httpsActive = false;
  let sslValid = false;
  let sslDetails = {};
  let redirectHttps = false;
  let blacklist = false;
  let spf = { exists: false, valid: false, details: "" };
  let dmarc = { exists: false, valid: false, details: "" };
  let headers = { found: 0, missing: [], invalid: [] };
  let sensitiveFound = [];

  // Fungsi bantu untuk menambah risiko
  const addRisk = (text, penalty) => {
    risks.push(`- ${text} (-${penalty})`);
    score -= penalty;
  };

  const addFinding = (text) => {
    findings.push(`- ${text}`);
  };

  const addRecommendation = (text) => {
    recommendations.push(`- ${text}`);
  };

  // ---------- 1. CEK SSL/TLS DETAIL ----------
  const checkSSL = (domain) => {
    return new Promise((resolve) => {
      const socket = tls.connect(
        { host: domain, port: 443, rejectUnauthorized: false },
        () => {
          const cert = socket.getPeerCertificate();
          socket.destroy();
          if (cert && Object.keys(cert).length > 0) {
            const now = Date.now();
            const validFrom = new Date(cert.valid_from).getTime();
            const validTo = new Date(cert.valid_to).getTime();
            const isValid = now >= validFrom && now <= validTo;
            resolve({
              valid: isValid,
              cert,
              validFrom: cert.valid_from,
              validTo: cert.valid_to,
              subject: cert.subject,
              issuer: cert.issuer,
            });
          } else {
            resolve({ valid: false, cert: null });
          }
        }
      );
      socket.on("error", () => resolve({ valid: false, cert: null }));
      socket.setTimeout(5000, () => {
        socket.destroy();
        resolve({ valid: false, cert: null });
      });
    });
  };

  // ---------- 2. CEK HEADER KEAMANAN (nilai) ----------
  const checkSecurityHeaders = (headers) => {
    const result = {
      found: 0,
      missing: [],
      invalid: [],
    };

    const required = [
      {
        key: "content-security-policy",
        name: "Content-Security-Policy",
        validate: (val) => /default-src\s+['"]?(?:self|'self')['"]?/.test(val),
      },
      {
        key: "x-frame-options",
        name: "X-Frame-Options",
        validate: (val) => ["DENY", "SAMEORIGIN"].includes(val.toUpperCase()),
      },
      {
        key: "x-content-type-options",
        name: "X-Content-Type-Options",
        validate: (val) => val.toLowerCase() === "nosniff",
      },
      {
        key: "strict-transport-security",
        name: "Strict-Transport-Security",
        validate: (val) => /max-age=\d+/i.test(val),
      },
      {
        key: "referrer-policy",
        name: "Referrer-Policy",
        validate: (val) =>
          [
            "no-referrer",
            "no-referrer-when-downgrade",
            "origin",
            "origin-when-cross-origin",
            "same-origin",
            "strict-origin",
            "strict-origin-when-cross-origin",
          ].includes(val.toLowerCase()),
      },
      {
        key: "permissions-policy",
        name: "Permissions-Policy",
        validate: (val) => /geolocation=\(\)/.test(val) || /interest-cohort=\(\)/.test(val),
      },
    ];

    const lowerHeaders = {};
    for (const [k, v] of Object.entries(headers || {})) {
      lowerHeaders[k.toLowerCase()] = v;
    }

    for (const h of required) {
      const value = lowerHeaders[h.key];
      if (value) {
        result.found++;
        if (h.validate && !h.validate(value)) {
          result.invalid.push({ name: h.name, value });
        }
      } else {
        result.missing.push(h.name);
      }
    }
    return result;
  };

  // ---------- 3. CEK SPF (validasi sintaks) ----------
  const checkSPF = async (domain) => {
    try {
      const txt = await dns.resolveTxt(domain);
      const flat = txt.flat().join(" ");
      if (flat.includes("v=spf1")) {
        // Cek apakah ada mekanisme
        const parts = flat.split(/\s+/);
        const hasMechanism = parts.some((p) => /^[+\-~?]/.test(p));
        return {
          exists: true,
          valid: hasMechanism,
          details: flat,
        };
      }
    } catch {}
    return { exists: false, valid: false, details: "" };
  };

  // ---------- 4. CEK DMARC (validasi sintaks) ----------
  const checkDMARC = async (domain) => {
    try {
      const txt = await dns.resolveTxt(`_dmarc.${domain}`);
      const flat = txt.flat().join(" ");
      if (flat.includes("v=DMARC1")) {
        // Cek apakah ada policy p=
        const hasPolicy = /p=(none|quarantine|reject)/i.test(flat);
        return {
          exists: true,
          valid: hasPolicy,
          details: flat,
        };
      }
    } catch {}
    return { exists: false, valid: false, details: "" };
  };

  // ---------- 5. CEK BLACKLIST (URLhaus) ----------
  const checkBlacklist = async (domain) => {
    try {
      const res = await axios.post(
        "https://urlhaus-api.abuse.ch/v1/host/",
        new URLSearchParams({ host: domain }),
        { timeout: 10000, headers: { "User-Agent": "Mozilla/5.0" } }
      );
      if (res.data?.query_status && res.data.query_status !== "no_results") {
        return true;
      }
    } catch {}
    return false;
  };

  // ---------- 6. SCAN SENSITIVE PATH (HEAD, dengan filter) ----------
  const scanSensitivePaths = async (baseUrl) => {
    const paths = [
      "/.env",
      "/.git/config",
      "/config.json",
      "/backup.zip",
      "/database.sql",
      "/phpmyadmin",
      "/server-status",
    ];
    const found = [];
    for (const path of paths) {
      try {
        const res = await axios.head(baseUrl + path, {
          timeout: 4000,
          validateStatus: () => true,
          headers: { "User-Agent": "Mozilla/5.0" },
        });
        if (res.status === 200) {
          const length = parseInt(res.headers["content-length"] || "0", 10);
          // Hanya anggap temuan jika konten tidak kosong dan bukan halaman 404 palsu
          if (length > 100) {
            found.push({ path, status: res.status, size: length });
          }
        }
      } catch {}
    }
    return found;
  };

  // ---------- EKSEKUSI UTAMA ----------
  try {
    // 1. HTTPS request (untuk header dan redirect)
    const httpsRes = await axios.get(`https://${domain}`, {
      timeout: 10000,
      maxRedirects: 5,
      validateStatus: () => true,
      headers: { "User-Agent": "Mozilla/5.0" },
    });

    httpsActive = true;
    finalUrl = httpsRes.request?.res?.responseUrl || `https://${domain}`;

    // 2. Cek SSL (terpisah)
    const sslInfo = await checkSSL(domain);
    sslValid = sslInfo.valid;
    sslDetails = sslInfo;

    if (!sslValid) {
      addRisk("SSL/TLS tidak valid atau expired", 20);
      addFinding("Sertifikat SSL tidak valid.");
      addRecommendation("Perbarui sertifikat SSL segera.");
    } else {
      // Tampilkan info masa berlaku
      const expiry = new Date(sslInfo.validTo);
      const now = new Date();
      const daysLeft = Math.floor((expiry - now) / (1000 * 60 * 60 * 24));
      if (daysLeft < 30) {
        addRisk(`SSL akan expired dalam ${daysLeft} hari`, 5);
        addRecommendation(`Perpanjang sertifikat SSL (tersisa ${daysLeft} hari).`);
      }
    }

    // 3. Cek redirect HTTP -> HTTPS
    try {
      const httpRes = await axios.get(`http://${domain}`, {
        timeout: 5000,
        maxRedirects: 5,
        validateStatus: () => true,
        headers: { "User-Agent": "Mozilla/5.0" },
      });
      const final = httpRes.request?.res?.responseUrl || "";
      if (final.startsWith("https://")) {
        redirectHttps = true;
      }
    } catch {}

    if (!redirectHttps) {
      addRisk("HTTP tidak redirect ke HTTPS", 10);
      addRecommendation("Konfigurasikan redirect 301 dari HTTP ke HTTPS.");
    }

    // 4. Periksa header keamanan (dengan validasi nilai)
    const headerResult = checkSecurityHeaders(httpsRes.headers);
    headers = headerResult;

    for (const missing of headerResult.missing) {
      addRisk(`Header ${missing} hilang`, 5);
      addRecommendation(`Tambahkan header: ${missing}`);
    }
    for (const invalid of headerResult.invalid) {
      addRisk(`Header ${invalid.name} tidak aman (nilai: "${invalid.value}")`, 3);
      addRecommendation(`Perbaiki nilai header ${invalid.name} agar sesuai standar keamanan.`);
    }

    // 5. SPF
    const spfResult = await checkSPF(domain);
    spf = spfResult;
    if (!spf.exists) {
      addRisk("SPF tidak ditemukan", 8);
      addRecommendation("Buat record SPF di DNS (contoh: v=spf1 +a +mx ~all)");
      addFinding("SPF tidak ditemukan.");
    } else if (!spf.valid) {
      addRisk("SPF ada tapi tidak memiliki mekanisme valid (misal ~all)", 3);
      addRecommendation("Tambahkan mekanisme seperti ~all atau -all pada SPF.");
      addFinding("SPF tidak lengkap.");
    }

    // 6. DMARC
    const dmarcResult = await checkDMARC(domain);
    dmarc = dmarcResult;
    if (!dmarc.exists) {
      addRisk("DMARC tidak ditemukan", 7);
      addRecommendation("Buat record DMARC di DNS (contoh: v=DMARC1; p=reject; rua=mailto:dmarc@domain)");
      addFinding("DMARC tidak ditemukan.");
    } else if (!dmarc.valid) {
      addRisk("DMARC ada tapi tidak memiliki kebijakan (p=)", 3);
      addRecommendation("Tambahkan kebijakan p= (none/quarantine/reject) pada DMARC.");
      addFinding("DMARC tidak memiliki policy.");
    }

    // 7. Blacklist
    blacklist = await checkBlacklist(domain);
    if (blacklist) {
      addRisk("Domain terdeteksi di blacklist (URLhaus)", 30);
      addRecommendation("Segera periksa dan bersihkan domain dari malware/abuse.");
      addFinding("Domain terdaftar dalam blacklist.");
    }

    // 8. Sensitive path scan (dengan HEAD)
    sensitiveFound = await scanSensitivePaths(`https://${domain}`);
    if (sensitiveFound.length > 0) {
      addRisk(`Sensitive path terdeteksi: ${sensitiveFound.map(s => s.path).join(", ")}`, 15);
      addRecommendation("Batasi akses ke direktori sensitif atau nonaktifkan index.");
      addFinding(`Path sensitif terbuka: ${sensitiveFound.map(s => s.path).join(", ")}`);
    }

    // Batasi skor
    score = Math.max(0, Math.min(100, score));

    // Grade
    let grade = "A+ (Hardened)";
    if (score < 95) grade = "A (Sangat kuat)";
    if (score < 90) grade = "B (Baik)";
    if (score < 75) grade = "C (Cukup)";
    if (score < 60) grade = "D (Lemah)";
    if (score < 40) grade = "E (Berisiko)";

    // Format hasil
    const result = `
*Security Score*

*Overview*
- *Domain:* ${domain}
- *Final URL:* ${finalUrl}
- *Score:* ${score}/100
- *Grade:* ${grade}

*Checks*
- *HTTPS Aktif:* ${httpsActive ? "Ya" : "Tidak"}
- *SSL Valid:* ${sslValid ? "Ya" : "Tidak"}${sslInfo.validTo ? ` (exp: ${new Date(sslInfo.validTo).toISOString().split('T')[0]})` : ""}
- *HTTP -> HTTPS:* ${redirectHttps ? "Ya" : "Tidak"}
- *Security Headers:* ${headers.found}/6 (${headers.missing.length} hilang, ${headers.invalid.length} tidak aman)
- *Header Hilang:* ${headers.missing.length ? headers.missing.join(", ") : "-"}
- *Header Tidak Aman:* ${headers.invalid.length ? headers.invalid.map(h => `${h.name} (${h.value})`).join(", ") : "-"}
- *SPF:* ${spf.exists ? (spf.valid ? "Ada & Valid" : "Ada tapi tidak lengkap") : "Tidak ada"}
- *DMARC:* ${dmarc.exists ? (dmarc.valid ? "Ada & Valid" : "Ada tapi tidak lengkap") : "Tidak ada"}
- *Blacklist:* ${blacklist ? "Terdeteksi" : "Tidak terdeteksi"}
- *Sensitive Paths:* ${sensitiveFound.length ? sensitiveFound.map(s => s.path).join(", ") : "Tidak terlihat"}

*Risk Breakdown*
${risks.length ? risks.join("\n") : "- Tidak ada pengurang skor signifikan"}

*Findings*
${findings.length ? findings.join("\n") : "- Tidak ada temuan besar"}

*Recommendations*
${recommendations.length ? recommendations.join("\n") : "- Sudah aman, tidak ada rekomendasi."}

*Audit*
- *Checked At:* ${new Date().toISOString().replace("T", " ")}
- *Source:* HTTP/HTTPS target, TLS handshake, DNS TXT, URLhaus
- *Cache TTL:* 10 menit
- *Scope:* Penilaian heuristik dari sinyal teknis, bukan audit menyeluruh.
`.trim();

    // Simpan cache
    cache.set(domain, { result, time: Date.now() });
    await global.loading(m, conn, true);
    m.reply(result);

  } catch (e) {
    await global.loading(m, conn, true);
    m.reply(`Gagal memeriksa domain.\n\n${e.message}`);
  }
};

handler.help = ["security <domain>"];
handler.tags = ["tools"];
handler.command = /^(security|secscore)$/i;

handler.desc = [
  "Audit keamanan dasar website dengan pemeriksaan mendalam",
  "Cek HTTPS, SSL (masa berlaku), header (dengan validasi nilai), DNS (SPF/DMARC), blacklist, sensitive path",
  "Menampilkan skor, temuan, dan rekomendasi perbaikan"
];

export default handler;