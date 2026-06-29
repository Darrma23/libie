/**
 * @file Image enhancement and upscaling module
 * @module lib/remini
 * @license Apache-2.0
 * @author Himejima
 */

import axios from "axios";
import FormData from "form-data";
import crypto from "node:crypto";
import { CookieJar } from "tough-cookie";
import { wrapper } from "axios-cookiejar-support";

class WinkEnhancer {
  constructor() {
    this.BASE_URL = "https://wink.ai";
    this.STRATEGY_URL = "https://strategy.app.meitudata.com";
    this.CLIENT_ID = "1189857605";
    this.VERSION = "5.1.2";
    this.COUNTRY_CODE = "ID";
    this.CLIENT_LANGUAGE = "en_US";
    this.CLIENT_TIMEZONE = "Asia/Jakarta";
    this.TASK_TYPE = "12";
    this.CONTENT_TYPE = "1";
    this.EXT_VALUE = "2";
    this.UA = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36";
    this.GNUM = crypto.randomUUID();
    this.jar = new CookieJar();
    this.api = wrapper(axios.create({
      baseURL: this.BASE_URL,
      jar: this.jar,
      withCredentials: true,
      validateStatus: () => true,
      headers: {
        accept: "*/*",
        origin: this.BASE_URL,
        referer: `${this.BASE_URL}/image-enhancer/upload`,
        "user-agent": this.UA,
        "sec-ch-ua": '"Google Chrome";v="147", "Not.A/Brand";v="8", "Chromium";v="147"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        ab_info: JSON.stringify({ ab_codes: [], version: "1.4.4" })
      }
    }));
  }

  _sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  _detectMime(buffer) {
    const u = new Uint8Array(buffer);
    if (u[0] === 255 && u[1] === 216) return "image/jpeg";
    if (u[0] === 137 && u[1] === 80 && u[2] === 78 && u[3] === 71) return "image/png";
    if (u[0] === 82 && u[1] === 73 && u[2] === 70 && u[3] === 71 &&
        u[8] === 87 && u[9] === 69 && u[10] === 66 && u[11] === 80) return "image/webp";
    return "application/octet-stream";
  }

  _extFromMime(mime) {
    if (mime === "image/jpeg") return ".jpg";
    if (mime === "image/png") return ".png";
    if (mime === "image/webp") return ".webp";
    return ".jpg";
  }

  _makeTrace() {
    return `${crypto.randomBytes(16).toString("hex")}-${crypto.randomBytes(8).toString("hex")}-1`;
  }

  _traceHeaders(transaction = "GET%20%2F%5Blocale%5D%2Fimage-enhancer%2Fupload") {
    const trace = this._makeTrace();
    return {
      "sentry-trace": trace,
      baggage: [
        "sentry-environment=release",
        `sentry-release=${this.VERSION}%20(b60d25c477f43c6dfac4107810f26d442320f4f1)`,
        "sentry-public_key=e1bf914f3448d9bc8a10c7e499d17d54",
        `sentry-trace_id=${trace.split("-")[0]}`,
        `sentry-transaction=${transaction}`,
        "sentry-sampled=true",
        "sentry-sample_rate=0.75"
      ].join(",")
    };
  }

  _baseParams(extra = {}) {
    return new URLSearchParams({
      client_id: this.CLIENT_ID,
      version: this.VERSION,
      country_code: this.COUNTRY_CODE,
      gnum: this.GNUM,
      client_language: this.CLIENT_LANGUAGE,
      client_channel_id: "",
      client_timezone: this.CLIENT_TIMEZONE,
      ...extra
    });
  }

  async _getSign(suffix) {
    const params = this._baseParams({ suffix, type: "temp", count: "1" });
    const res = await this.api.get(`/api/file/get_maat_sign.json?${params}`, {
      headers: this._traceHeaders()
    });
    if (res.status >= 400 || res.data?.code !== 0)
      throw new Error(`get_maat_sign gagal: ${JSON.stringify(res.data)}`);
    return res.data.data;
  }

  async _getPolicy(sign) {
    const params = new URLSearchParams({
      app: sign.app, count: String(sign.count), sig: sign.sig,
      sigTime: sign.sig_time, sigVersion: sign.sig_version,
      suffix: sign.suffix, type: sign.type
    });
    const res = await axios.get(`${this.STRATEGY_URL}/upload/policy?${params}`, {
      headers: {
        accept: "*/*", origin: this.BASE_URL, referer: `${this.BASE_URL}/`,
        "user-agent": this.UA,
        "sec-ch-ua": '"Google Chrome";v="147", "Not.A/Brand";v="8", "Chromium";v="147"',
        "sec-ch-ua-mobile": "?1", "sec-ch-ua-platform": '"Android"'
      },
      validateStatus: () => true
    });
    if (res.status >= 400 || !Array.isArray(res.data) || !res.data[0]?.qiniu)
      throw new Error(`upload policy gagal: ${JSON.stringify(res.data)}`);
    return res.data[0].qiniu;
  }

  async _upload(policy, imageBuffer, mime, filename = "image.jpg") {
    const form = new FormData();
    form.append("file", imageBuffer, { filename, contentType: mime });
    form.append("token", policy.token);
    form.append("key", policy.key);
    form.append("fname", filename);
    const res = await axios.post(policy.url, form, {
      headers: form.getHeaders({
        origin: this.BASE_URL, referer: `${this.BASE_URL}/`,
        "user-agent": this.UA, accept: "*/*"
      }),
      maxBodyLength: Infinity, maxContentLength: Infinity,
      validateStatus: () => true
    });
    if (res.status >= 400)
      throw new Error(`upload qiniu gagal HTTP ${res.status}`);
    if (!res.data?.url && !res.data?.data)
      throw new Error(`upload qiniu response tidak valid`);
    return {
      file_key: policy.key,
      source_url: res.data.url || res.data.data || policy.data
    };
  }

  async _getMeta(fileKey) {
    const body = this._baseParams({ file_key: fileKey });
    const res = await this.api.post("/api/file/meta_info.json", body.toString(), {
      headers: { ...this._traceHeaders(), "content-type": "application/x-www-form-urlencoded;charset=UTF-8" }
    });
    if (res.status >= 400 || res.data?.code !== 0)
      throw new Error(`meta info gagal`);
    return res.data.data;
  }

  async _calcBeans() {
    const typeParams = JSON.stringify({ is_mirror: 0, orientation_tag: 1, j_420_trans: "1", return_ext: "2" });
    const rightDetail = JSON.stringify({ source: "1", touch_type: "4", function_id: "630", material_id: "63011", url: "https://wink.ai/image-enhancer/upload" });
    const itemList = JSON.stringify([{
      type: Number(this.TASK_TYPE), ext_value: this.EXT_VALUE,
      content_type: Number(this.CONTENT_TYPE), duration: 0,
      type_params: typeParams, right_detail: rightDetail
    }]);
    const body = this._baseParams({ item_list: itemList });
    const res = await this.api.post("/api/subscribe/batch_calc_need_beans.json", body.toString(), {
      headers: { ...this._traceHeaders(), "content-type": "application/x-www-form-urlencoded;charset=UTF-8" }
    });
    if (res.status >= 400 || res.data?.code !== 0)
      throw new Error(`calc beans gagal`);
    return res.data.data;
  }

  async _delivery(sourceUrl, taskName) {
    const body = this._baseParams({
      type: this.TASK_TYPE, content_type: this.CONTENT_TYPE, source_url: sourceUrl,
      type_params: JSON.stringify({ is_mirror: 0, orientation_tag: 1, j_420_trans: "1", return_ext: "2" }),
      right_detail: JSON.stringify({ source: "1", touch_type: "4", function_id: "630", material_id: "63011", url: "https://wink.ai/image-enhancer/upload" }),
      ext_params: JSON.stringify({ task_name: taskName, records: this.TASK_TYPE }),
      with_prepare: "1"
    });
    const res = await this.api.post("/api/meitu_ai/delivery.json", body.toString(), {
      headers: { ...this._traceHeaders(), "content-type": "application/x-www-form-urlencoded;charset=UTF-8" }
    });
    if (res.status >= 400 || res.data?.code !== 0)
      throw new Error(`delivery gagal`);
    const data = res.data.data || {};
    return { msg_id: data.msg_id || "", prepare_msg_id: data.prepare_msg_id || "" };
  }

  async _query(msgId) {
    const params = this._baseParams({ msg_ids: msgId });
    const res = await this.api.get(`/api/meitu_ai/query_batch.json?${params}`, {
      headers: { ...this._traceHeaders("%2F%3Alocale%2Feditor%2Frecent-task"), referer: `${this.BASE_URL}/image-enhancer/upload` }
    });
    if (res.status >= 400 || res.data?.code !== 0)
      throw new Error(`query batch gagal`);
    return res.data.data;
  }

  _extractResultUrl(data) {
    return data?.item_list?.[0]?.result?.media_info_list?.[0]?.media_data || "";
  }

  _extractNextMsgId(data, currentMsgId) {
    const item = data?.item_list?.[0];
    const resultValue = item?.result?.result || "";
    const realMsgId = item?.result?.msg_id || item?.msg_id || "";
    if (resultValue && resultValue !== currentMsgId && !resultValue.startsWith("http"))
      return resultValue;
    if (realMsgId && realMsgId !== currentMsgId && !realMsgId.startsWith("wpr_"))
      return realMsgId;
    return "";
  }

  async _waitResult(firstMsgId, maxTry = 80, delayMs = 3000) {
    let msgId = firstMsgId;
    let last = null;
    for (let i = 1; i <= maxTry; i++) {
      const data = await this._query(msgId);
      last = data;
      const nextMsgId = this._extractNextMsgId(data, msgId);
      if (nextMsgId) { msgId = nextMsgId; await this._sleep(1000); continue; }
      const url = this._extractResultUrl(data);
      const errorCode = data?.item_list?.[0]?.result?.error_code;
      const errorMsg = data?.item_list?.[0]?.result?.error_msg;
      if (url && url.startsWith("http") && errorCode === 0) return url;
      if (errorCode && errorCode !== 29901 && errorCode !== 0)
        throw new Error(`task gagal: ${errorCode} ${errorMsg || ""}`);
      await this._sleep(delayMs);
    }
    throw new Error(`result timeout: ${JSON.stringify(last)}`);
  }

  async generate(imageBuffer) {
    if (!Buffer.isBuffer(imageBuffer))
      throw new Error("imageBuffer harus berupa Buffer");

    await this.jar.setCookie(`_sm=${this.GNUM}; Path=/; Domain=wink.ai`, this.BASE_URL);
    await this.jar.setCookie(`meitustat=${encodeURIComponent(JSON.stringify({ wgid: this.GNUM }))}; Path=/; Domain=wink.ai`, this.BASE_URL);

    const mime = this._detectMime(imageBuffer);
    const ext = this._extFromMime(mime);
    const taskName = `Enhancer-Ultra-HD-${Date.now()}`;
    const filename = `image${ext}`;

    const sign = await this._getSign(ext);
    const policy = await this._getPolicy(sign);
    const uploaded = await this._upload(policy, imageBuffer, mime, filename);
    await this._getMeta(uploaded.file_key);
    await this._calcBeans();
    const task = await this._delivery(uploaded.source_url, taskName);
    const firstMsgId = task.msg_id || task.prepare_msg_id;
    if (!firstMsgId) throw new Error("delivery tidak mengembalikan msg_id");
    return await this._waitResult(firstMsgId);
  }
}

/**
 * Enhances image quality using Wink.ai
 * @async
 * @param {Buffer} buf - Image buffer to enhance
 * @returns {Promise<{ success: boolean, resultUrl?: string, error?: string }>}
 */
export async function remini(buf) {
  try {
    const wink = new WinkEnhancer();
    const resultUrl = await wink.generate(buf);
    return { success: true, resultUrl };
  } catch (err) {
    return { success: false, error: err.message };
  }
}