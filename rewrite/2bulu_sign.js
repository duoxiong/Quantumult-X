/*
项目名称：两步路户外助手 - 存储容量签到 (自动抓取+兜底版)
项目功能：每日自动领取 10M 存储空间。
更新说明：
1. 兼容两步路特有的 errCode 响应机制，解决 -2 报错提示。
2. 支持自动抓取：App 内点击“签到领取”即可自动同步最新凭证。
3. 预设硬编码兜底：内置 5月11日 抓取的有效数据，更新即用。

================ Quantumult X 配置指南 ================
[MITM]
hostname = helper.2bulu.com

[rewrite_local]
# 核心抓取规则：拦截领取容量的 POST 请求
^https:\/\/helper\.2bulu\.com\/dataSpace\/claimCapacity url script-request-body https://raw.githubusercontent.com/duoxiong/Quantumult-X/refs/heads/main/rewrite/2bulu_sign.js

[task_local]
# 每天早上 9:15 执行一次
15 9 * * * https://raw.githubusercontent.com/duoxiong/Quantumult-X/refs/heads/main/rewrite/2bulu_sign.js, tag=两步路容量签到, enabled=true
=======================================================
*/

const $ = new Env("两步路容量签到");

// ---------------------- 存储键名 ----------------------
const KEY_URL = "duoxiong_2bulu_capacity_url";
const KEY_HEADERS = "duoxiong_2bulu_capacity_headers";
const KEY_BODY = "duoxiong_2bulu_capacity_body";

// -------------------------------------------------------
// 🚦 逻辑入口
// -------------------------------------------------------
if (typeof $request !== 'undefined') {
    CaptureLogic();
} else {
    SignInLogic();
}

// -------------------------------------------------------
// 📡 1. 自动抓取逻辑 (点击“签到领取”触发)
// -------------------------------------------------------
function CaptureLogic() {
    const url = $request.url;
    const headers = $request.headers;
    const body = $request.body;

    if (url.indexOf("claimCapacity") > -1 && body) {
        $.setdata(url, KEY_URL);
        $.setdata(JSON.stringify(headers), KEY_HEADERS);
        $.setdata(body, KEY_BODY);

        $.msg($.name, "✅ 抓取成功", "已锁定存储扩容接口，后续将按此凭证自动运行。");
        console.log(`[两步路] 成功捕获 URL: ${url}`);
        console.log(`[两步路] 成功捕获 Body: ${body}`);
    }
    $.done();
}

// -------------------------------------------------------
// 🚀 2. 签到执行逻辑
// -------------------------------------------------------
function SignInLogic() {
    // 优先从本地存储读取抓取到的数据
    let signUrl = $.getdata(KEY_URL);
    let signHeadersStr = $.getdata(KEY_HEADERS);
    let signBody = $.getdata(KEY_BODY);

    // --- 💡 硬编码兜底数据 (基于 2026-05-11 抓包数据) ---
    if (!signUrl) {
        console.log(">>> 未发现本地抓取数据，启动硬编码兜底程序...");
        signUrl = "https://helper.2bulu.com/dataSpace/claimCapacity?psign=4c9077afc211b04348b3c0db55e55813";
        signHeadersStr = JSON.stringify({
            "Host": "helper.2bulu.com",
            "Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
            "Cookie": "authCode=A0KJFPhCXvchohO3MjeB%2FpCeYxyfqbx1vceit4NyIiG0VIg5eFQu5A%3D%3D; token=uOWVhtWzrcic1PzFlIUZww%3D%3D",
            "User-Agent": "region:CN;lan:zh-Hans;OutdoorAssistantApplication/9.0.2 (lolaage.2bulu.zhushou; build:9.0.2.5; iOS 18.7.8) Alamofire/5.9.1",
            "Encrypt-Type": "1",
            "Accept": "*/*"
        });
        signBody = "authCode=f0edb44c794b460aa6f5e3812c93ca2b&authType=1&deviceName=iPhone%2016%20Pro%20Max&p_appVersion=9.0.2&p_productType=0&p_terminalType=3&p_userId=63273918&sdkLevel=18.7.8&taskId=1&userId=63273918";
    }

    const headers = JSON.parse(signHeadersStr);
    // 清理动态请求头
    delete headers['Content-Length'];
    delete headers['content-length'];

    const opts = {
        url: signUrl,
        method: "POST",
        headers: headers,
        body: signBody
    };

    console.log(">>> 正在执行两步路容量领取任务...");
    $.post(opts, (err, resp, data) => {
        try {
            if (err) {
                $.msg($.name, "🚫 网络请求失败", err);
            } else {
                const res = JSON.parse(data);
                // 核心逻辑：同时识别 code, errCode 以及 message, errMsg
                const code = res.code !== undefined ? res.code : res.errCode;
                const msg = res.message || res.msg || res.errMsg || "";

                if (code == 0 || msg === "success") {
                    $.msg($.name, "✅ 领取成功", "存储空间已成功扩容 10M。");
                } else if (code == -2 || msg.includes("重复") || msg.includes("领取失败") || msg.includes("已经")) {
                    // 将 errCode -2 正确识别为重复领取，避免误报错
                    $.msg($.name, "ℹ️ 重复签到", "今日容量已领取，请明天再来。");
                } else {
                    $.msg($.name, "⚠️ 签到异常", msg || "请查看控制台日志");
                    console.log(`[两步路] 服务器响应详情: ${data}`);
                }
            }
        } catch (e) {
            $.msg($.name, "❌ 响应解析异常", "非 JSON 数据返回，可能凭证已失效。");
            console.log(`[两步路] 返回数据原文: ${data}`);
        }
        $.done();
    });
}

// -------------------------------------------------------
// ⚙️ Env 环境类 (单文件无依赖极简版)
// -------------------------------------------------------
function Env(t, e) {
    return new class {
        constructor(t, e) {
            this.name = t, this.startTime = (new Date).getTime(), Object.assign(this, e), console.log(`🔔${this.name}, 开始!`)
        }
        isQuanX() { return "undefined" != typeof $task }
        getdata(t) { return this.isQuanX() ? $prefs.valueForKey(t) : null }
        setdata(t, e) { return this.isQuanX() ? $prefs.setValueForKey(t, e) : null }
        msg(t = this.name, e = "", s = "") { this.isQuanX() && $notify(t, e, s) }
        post(t, e = (() => { })) {
            if (this.isQuanX()) {
                t.method = "POST";
                $task.fetch(t).then(t => {
                    const { statusCode: s, headers: r, body: o } = t;
                    e(null, { status: s, headers: r, body: o }, o)
                }, t => e(t && t.error || "UndefinedError"))
            }
        }
        done(t = {}) {
            const e = (new Date).getTime(), s = (e - this.startTime) / 1e3;
            console.log(`🔔${this.name}, 结束! 🕛 ${s} 秒`), $done(t)
        }
    }(t, e)
}
