/*
项目名称：两步路户外助手 - 存储容量签到 (自动抓取版)
项目功能：每日自动领取 10M 存储空间。
更新内容：
1. 采用与长城脚本一致的样式封装，内置 Env 环境。
2. 开启自动抓取：App 内点击按钮即自动更新本地 Token、URL 和 Body。
3. 预设兜底数据：内置你 5月11日 抓取的有效数据，更新脚本后即便不抓包也能立刻运行。

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

// 🚦 逻辑入口
if (typeof $request !== 'undefined') {
    CaptureLogic();
} else {
    SignInLogic();
}

// ---------------------- 1. 自动抓取逻辑 ----------------------
function CaptureLogic() {
    const url = $request.url;
    const headers = $request.headers;
    const body = $request.body;

    if (url.indexOf("claimCapacity") > -1 && body) {
        $.setdata(url, KEY_URL);
        $.setdata(JSON.stringify(headers), KEY_HEADERS);
        $.setdata(body, KEY_BODY);

        $.msg($.name, "✅ 抓取成功", "已自动更新签到数据包，后续将按此凭证自动运行。");
        console.log(`[两步路] 捕获新 URL: ${url}`);
        console.log(`[两步路] 捕获新 Body: ${body}`);
    }
    $.done();
}

// ---------------------- 2. 签到执行逻辑 ----------------------
function SignInLogic() {
    // 优先读取本地抓取的数据
    let signUrl = $.getdata(KEY_URL);
    let signHeadersStr = $.getdata(KEY_HEADERS);
    let signBody = $.getdata(KEY_BODY);

    // --- 兜底数据 (如果你还没抓包，或者数据被清理，脚本依然能跑) ---
    if (!signUrl) {
        console.log(">>> 未发现本地抓取数据，使用预设兜底凭证...");
        signUrl = "https://helper.2bulu.com/dataSpace/claimCapacity?psign=4c9077afc211b04348b3c0db55e55813";
        signHeadersStr = JSON.stringify({
            "Host": "helper.2bulu.com",
            "Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
            "Cookie": "authCode=A0KJFPhCXvchohO3MjeB%2FpCeYxyfqbx1vceit4NyIiG0VIg5eFQu5A%3D%3D; token=uOWVhtWzrcic1PzFlIUZww%3D%3D",
            "User-Agent": "region:CN;lan:zh-Hans;OutdoorAssistantApplication/9.0.2 (lolaage.2bulu.zhushou; build:9.0.2.5; iOS 18.7.8) Alamofire/5.9.1",
            "Encrypt-Type": "1"
        });
        signBody = "authCode=f0edb44c794b460aa6f5e3812c93ca2b&authType=1&deviceName=iPhone%2016%20Pro%20Max&p_appVersion=9.0.2&p_productType=0&p_terminalType=3&p_userId=63273918&sdkLevel=18.7.8&taskId=1&userId=63273918";
    }

    const headers = JSON.parse(signHeadersStr);
    // 清理可能导致报错的动态 Header
    delete headers['Content-Length'];
    delete headers['content-length'];

    const opts = {
        url: signUrl,
        method: "POST",
        headers: headers,
        body: signBody
    };

    console.log(">>> 正在执行容量签到任务...");
    $.post(opts, (err, resp, data) => {
        try {
            if (err) {
                $.msg($.name, "🚫 网络错误", err);
            } else {
                const res = JSON.parse(data);
                if (res.code == 0 || res.message === "success") {
                    $.msg($.name, "✅ 领取成功", "已成功扩容 10M。");
                } else if (data.includes("重复") || data.includes("已经") || res.code == 10001) {
                    $.msg($.name, "ℹ️ 重复签到", "今日任务已完成。");
                } else {
                    $.msg($.name, "⚠️ 签到异常", res.message || "请查看日志");
                    console.log("[两步路] 服务器响应: " + data);
                }
            }
        } catch (e) {
            $.msg($.name, "❌ 响应解析失败", "非 JSON 格式数据");
            console.log("[两步路] 原始返回: " + data);
        }
        $.done();
    });
}

// ---------------------- Env 环境类 (对齐长城脚本样式) ----------------------
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
