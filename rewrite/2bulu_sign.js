/*
项目名称：两步路户外助手 - 双效签到 (容量+绿豆)
项目功能：每日自动领取 10M 存储空间 + 签到领取绿豆。
更新说明：
1. 新增“签到领绿豆” GET 接口，实现多任务并发。
2. 采用异步队列执行，双任务结果合并推送，避免通知刷屏。
3. 内置最新抓包双兜底数据，彻底免抓包即跑。

================ Quantumult X 配置指南 ================
[MITM]
hostname = helper.2bulu.com

[rewrite_local]
# 拦截扩容与绿豆签到请求 (支持自动更新凭证)
^https:\/\/helper\.2bulu\.com\/(dataSpace\/claimCapacity|signIn) url script-request-body https://raw.githubusercontent.com/duoxiong/Quantumult-X/refs/heads/main/rewrite/2bulu_sign.js

[task_local]
# 每天早上 9:15 执行双效签到
15 9 * * * https://raw.githubusercontent.com/duoxiong/Quantumult-X/refs/heads/main/rewrite/2bulu_sign.js, tag=两步路双签, enabled=true
=======================================================
*/

const $ = new Env("两步路双签到");

// ---------------------- 存储键名 ----------------------
const KEY_HEADERS = "duoxiong_2bulu_headers";
const KEY_CAPACITY_URL = "duoxiong_2bulu_cap_url";
const KEY_CAPACITY_BODY = "duoxiong_2bulu_cap_body";
const KEY_GREENPEA_URL = "duoxiong_2bulu_pea_url";

// -------------------------------------------------------
// 🚦 逻辑入口
// -------------------------------------------------------
if (typeof $request !== 'undefined') {
    CaptureLogic();
} else {
    // 异步执行双任务
    (async () => {
        await SignInLogic();
    })().catch((e) => console.log(e)).finally(() => $.done());
}

// -------------------------------------------------------
// 📡 1. 自动抓取逻辑 (分别捕获两个接口)
// -------------------------------------------------------
function CaptureLogic() {
    const url = $request.url;
    const headers = $request.headers;
    const body = $request.body || "";

    // 抓取 Headers (两接口通用)
    if (headers) $.setdata(JSON.stringify(headers), KEY_HEADERS);

    if (url.indexOf("/dataSpace/claimCapacity") > -1 && body) {
        $.setdata(url, KEY_CAPACITY_URL);
        $.setdata(body, KEY_CAPACITY_BODY);
        $.msg($.name, "✅ 容量抓取成功", "已锁定存储扩容接口");
        console.log(`[两步路] 捕获容量 URL: ${url}`);
    } else if (url.indexOf("/signIn?") > -1) {
        $.setdata(url, KEY_GREENPEA_URL);
        $.msg($.name, "✅ 绿豆抓取成功", "已锁定签到领绿豆接口");
        console.log(`[两步路] 捕获绿豆 URL: ${url}`);
    }
    $.done();
}

// -------------------------------------------------------
// 🚀 2. 双效签到执行逻辑
// -------------------------------------------------------
async function SignInLogic() {
    // --- 💡 硬编码兜底数据 (基于抓包数据) ---
    const defaultHeaders = JSON.stringify({
        "Host": "helper.2bulu.com",
        "Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
        "Cookie": "authCode=A0KJFPhCXvchohO3MjeB%2FpCeYxyfqbx1vceit4NyIiG0VIg5eFQu5A%3D%3D; token=uOWVhtWzrcic1PzFlIUZww%3D%3D",
        "User-Agent": "region:CN;lan:zh-Hans;OutdoorAssistantApplication/9.0.3 (lolaage.2bulu.zhushou; build:9.0.3.0; iOS 18.7.8) Alamofire/5.9.1",
        "Encrypt-Type": "1",
        "Accept": "*/*"
    });

    const capUrl = $.getdata(KEY_CAPACITY_URL) || "https://helper.2bulu.com/dataSpace/claimCapacity?psign=4c9077afc211b04348b3c0db55e55813";
    const capBody = $.getdata(KEY_CAPACITY_BODY) || "authCode=f0edb44c794b460aa6f5e3812c93ca2b&authType=1&deviceName=iPhone%2016%20Pro%20Max&p_appVersion=9.0.2&p_productType=0&p_terminalType=3&p_userId=63273918&sdkLevel=18.7.8&taskId=1&userId=63273918";
    const peaUrl = $.getdata(KEY_GREENPEA_URL) || "https://helper.2bulu.com/signIn?deviceName=iPhone%2016%20Pro%20Max&p_appVersion=9.0.3&p_productType=0&p_terminalType=3&p_userId=63273918&sdkLevel=18.7.8&psign=a8f545f5f0d56c2cea8963c68322e970";
    
    let headersStr = $.getdata(KEY_HEADERS) || defaultHeaders;
    let headers = JSON.parse(headersStr);
    delete headers['Content-Length'];
    delete headers['content-length'];

    let resultMsg = "";

    // ==========================================
    // 🚶‍♂️ 任务一：领取存储容量 (POST)
    // ==========================================
    console.log(">>> 开始执行任务一：领取容量...");
    let res1 = await requestAsync({ url: capUrl, method: "POST", headers: headers, body: capBody });
    if (res1.err) {
        resultMsg += `🔴 容量: 网络请求失败\n`;
    } else {
        try {
            let data1 = JSON.parse(res1.data);
            let code1 = data1.code !== undefined ? data1.code : data1.errCode;
            let msg1 = data1.message || data1.msg || data1.errMsg || "";
            if (code1 == 0 || msg1 === "success") {
                resultMsg += `🟢 容量: 领取成功 (+10M)\n`;
            } else if (code1 == -2 || msg1.includes("重复") || msg1.includes("失败")) {
                resultMsg += `⚪️ 容量: 今日已领取\n`;
            } else {
                resultMsg += `⚠️ 容量: 异常 (${msg1})\n`;
            }
        } catch (e) {
            resultMsg += `🔴 容量: 解析失败\n`;
        }
    }

    // ==========================================
    // 🚶‍♂️ 任务二：签到领绿豆 (GET)
    // ==========================================
    console.log(">>> 开始执行任务二：签到领绿豆...");
    // GET 请求必须去除 Content-Type，防止报错
    let peaHeaders = Object.assign({}, headers);
    delete peaHeaders['Content-Type'];

    let res2 = await requestAsync({ url: peaUrl, method: "GET", headers: peaHeaders });
    if (res2.err) {
        resultMsg += `🔴 绿豆: 网络请求失败\n`;
    } else {
        try {
            let data2 = JSON.parse(res2.data);
            let code2 = data2.code !== undefined ? data2.code : data2.errCode;
            let msg2 = data2.message || data2.msg || data2.errMsg || "";
            // 依据抓包数据，成功返回 errCode 0 并且带有 amount
            if (code2 == 0 || msg2 === "success" || data2.amount !== undefined) {
                resultMsg += `🟢 绿豆: 签到成功 (+${data2.amount || '*'}豆)\n`;
            } else if (code2 == -2 || msg2.includes("重复") || msg2.includes("已经")) {
                resultMsg += `⚪️ 绿豆: 今日已签到\n`;
            } else {
                resultMsg += `⚠️ 绿豆: 异常 (${msg2})\n`;
            }
        } catch (e) {
            resultMsg += `🔴 绿豆: 解析失败\n`;
        }
    }

    // ==========================================
    // 📢 推送最终合并通知
    // ==========================================
    $.msg($.name, "双效任务执行完毕", resultMsg.trim());
}

// -------------------------------------------------------
// 🛠 工具函数：Promise 封装网络请求
// -------------------------------------------------------
function requestAsync(opts) {
    return new Promise((resolve) => {
        if (opts.method === 'GET') {
            $.get(opts, (err, resp, data) => resolve({ err, resp, data }));
        } else {
            $.post(opts, (err, resp, data) => resolve({ err, resp, data }));
        }
    });
}

// -------------------------------------------------------
// ⚙️ Env 环境类
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
        get(t, e = (() => { })) {
            if (this.isQuanX()) {
                t.method = "GET";
                $task.fetch(t).then(t => {
                    const { statusCode: s, headers: r, body: o } = t;
                    e(null, { status: s, headers: r, body: o }, o)
                }, t => e(t && t.error || "UndefinedError"))
            }
        }
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
