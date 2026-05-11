/*
脚本名称：两步路户外助手 自动签到 (智能抓包回放版)
更新内容：
1. 采用“全栈嗅探+无损回放”机制，自动捕获未知的签到接口和身份凭证。
2. 支持自动区分 GET/POST 请求，并动态重组 Headers。
*/

const $ = new Env("两步路签到");

const KEY_URL = "duoxiong_2bulu_url";
const KEY_METHOD = "duoxiong_2bulu_method";
const KEY_HEADERS = "duoxiong_2bulu_headers";
const KEY_BODY = "duoxiong_2bulu_body";

if (typeof $request !== 'undefined') {
    CaptureRequest();
} else {
    SignIn();
}

// ---------------------- 1. 智能抓取逻辑 ----------------------
function CaptureRequest() {
    const url = $request.url;
    const method = $request.method;
    const headers = $request.headers;
    const body = $request.body || "";

    // 过滤掉无关的页面加载请求
    if (url.match(/\.(jpg|png|gif|css|html|webp)/i)) {
        $.done({}); return;
    }

    // 保存该请求的所有原生特征
    $.setdata(url, KEY_URL);
    $.setdata(method, KEY_METHOD);
    $.setdata(JSON.stringify(headers), KEY_HEADERS);
    $.setdata(body, KEY_BODY);

    // 提取接口最后一段路径作为提示
    const pathInfo = url.split('.com')[1] || url;
    $.msg($.name, "✅ 捕获成功", "已锁定签到接口，可前往 QX 手动运行测试！\n接口: " + pathInfo);
    console.log(`[两步路] 抓取 URL: ${url}`);
    
    $.done({});
}

// ---------------------- 2. 无损回放逻辑 ----------------------
function SignIn() {
    const url = $.getdata(KEY_URL);
    const method = $.getdata(KEY_METHOD) || "POST";
    const headersStr = $.getdata(KEY_HEADERS);
    const body = $.getdata(KEY_BODY);

    if (!url || !headersStr) {
        $.msg($.name, "🚫 缺少数据", "请先在【两步路户外助手】APP 内手动点一次签到进行抓包。");
        $.done(); return;
    }

    let headers = {};
    try {
        headers = JSON.parse(headersStr);
        // 清理可能导致重放失败的特定请求头
        delete headers['Content-Length'];
        delete headers['content-length'];
        delete headers['Accept-Encoding']; // 防止返回乱码
    } catch (e) {
        console.log("[两步路] Headers 解析失败");
    }

    const opts = {
        url: url,
        method: method,
        headers: headers,
        body: body
    };

    // 如果是 GET 请求，必须剔除 Body，否则 QX 会报错
    if (method.toUpperCase() === "GET") {
        delete opts.body;
        $.get(opts, handleResponse);
    } else {
        $.post(opts, handleResponse);
    }
}

// ---------------------- 3. 结果处理逻辑 ----------------------
function handleResponse(err, resp, data) {
    if (err) {
        $.msg($.name, "🚫 网络错误", err);
    } else {
        try {
            const res = JSON.parse(data);
            // 兼容各类常见的 API 成功状态码
            if (res.code == 0 || res.code == 200 || res.status == 1 || res.success) {
                $.msg($.name, "✅ 签到成功", `反馈: ${res.message || res.msg || "任务完成"}`);
            } else if (JSON.stringify(res).includes("已经") || JSON.stringify(res).includes("重复")) {
                $.msg($.name, "ℹ️ 重复签到", "今日已经签过啦！");
            } else {
                $.msg($.name, "⚠️ 签到异常", res.message || res.msg || "请查看日志");
                console.log(`[两步路] 完整返回: ${data}`);
            }
        } catch (e) {
            $.msg($.name, "❌ 解析失败", "服务器返回格式非 JSON");
            console.log(`[两步路] 返回原文: ${data}`);
        }
    }
    $.done();
}

// ---------------------- Env 环境类 ----------------------
function Env(t, e) { class s { constructor(t) { this.env = t } send(t, e = "GET") { t = "string" == typeof t ? { url: t } : t; let s = this.get; return "POST" === e && (s = this.post), new Promise((e, i) => { s.call(this, t, (t, s, r) => { t ? i(t) : e(s) }) }) } get(t) { return this.send.call(this.env, t) } post(t) { return this.send.call(this.env, t, "POST") } } return new class { constructor(t, e) { this.name = t, this.http = new s(this), this.data = null, this.dataFile = "box.dat", this.startTime = (new Date).getTime(), Object.assign(this, e) } isNode() { return "undefined" != typeof module && !!module.exports } isQuanX() { return "undefined" != typeof $task } isSurge() { return "undefined" != typeof $httpClient && "undefined" == typeof $loon } isLoon() { return "undefined" != typeof $loon } getdata(t) { let e = this.getval(t); if (/^@/.test(t)) { const [, s, i] = /^@(.*?)\.(.*?)$/.exec(t), r = s ? this.getval(s) : ""; if (r) try { const t = JSON.parse(r); e = t ? t[i] : e } catch (t) { e = "" } } return e } setdata(t, e) { let s = !1; if (/^@/.test(e)) { const [, i, r] = /^@(.*?)\.(.*?)$/.exec(e), o = this.getval(i), a = i ? "null" === o ? null : o || "{}" : "{}"; try { const e = JSON.parse(a); e[r] = t, s = this.setval(JSON.stringify(e), i) } catch (e) { const o = {}; o[r] = t, s = this.setval(JSON.stringify(o), i) } } else s = this.setval(t, e); return s } getval(t) { return this.isSurge() || this.isLoon() ? $persistentStore.read(t) : this.isQuanX() ? $prefs.valueForKey(t) : null } setval(t, e) { return this.isSurge() || this.isLoon() ? $persistentStore.write(t, e) : this.isQuanX() ? $prefs.setValueForKey(t, e) : null } get(t, e = (() => { })) { if (this.isSurge() || this.isLoon()) $httpClient.get(t, (t, s, i) => { !t && s && (s.body = i, s.statusCode = s.status ? s.status : s.statusCode), e(t, s, i) }); else if (this.isQuanX()) $task.fetch(t).then(t => { const { statusCode: s, statusCode: i, headers: r, body: o } = t; e(null, { status: s, statusCode: i, headers: r, body: o }, o) }, t => e(t && t.error || "UndefinedError")) } post(t, e = (() => { })) { if (this.isSurge() || this.isLoon()) $httpClient.post(t, (t, s, i) => { !t && s && (s.body = i, s.statusCode = s.status ? s.status : s.statusCode), e(t, s, i) }); else if (this.isQuanX()) { t.method = "POST"; $task.fetch(t).then(t => { const { statusCode: s, statusCode: i, headers: r, body: o } = t; e(null, { status: s, statusCode: i, headers: r, body: o }, o) }, t => e(t && t.error || "UndefinedError")) } } msg(e = t, s = "", i = "", r) { if (this.isSurge() || this.isLoon()) $notification.post(e, s, i); else if (this.isQuanX()) $notify(e, s, i) } log(...t) { console.log(t.join("\n")) } logErr(t) { console.log(`❗${this.name}, 错误!\n${t}`) } wait(t) { return new Promise(e => setTimeout(e, t)) } done(t = {}) { $done(t) } }(t, e) }
