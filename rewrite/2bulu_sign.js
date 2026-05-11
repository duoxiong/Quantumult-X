/*
项目名称：两步路户外助手 - 存储容量签到 (完美克隆版)
更新说明：精准提取 /dataSpace/claimCapacity 接口，无视 psign 算法，直接克隆完整请求体进行无损回放。

================ Quantumult X 配置指南 ================
[MITM]
hostname = helper.2bulu.com

[rewrite_local]
# 拦截签到领取动作 (在“存储空间管理”页面点击“签到领取”触发)
^https:\/\/helper\.2bulu\.com\/dataSpace\/claimCapacity url script-request-body https://raw.githubusercontent.com/duoxiong/Quantumult-X/refs/heads/main/rewrite/2bulu_sign.js

[task_local]
# 每天早上 9:15 执行一次容量领取
15 9 * * * https://raw.githubusercontent.com/duoxiong/Quantumult-X/refs/heads/main/rewrite/2bulu_sign.js, tag=两步路容量签到, enabled=true
=======================================================
*/

const $ = new Env("两步路容量签到");

const KEY_URL = "duoxiong_2bulu_url";
const KEY_HEADERS = "duoxiong_2bulu_headers";
const KEY_BODY = "duoxiong_2bulu_body";

if (typeof $request !== 'undefined') {
    CaptureCapacitySign();
} else {
    ExecuteCapacitySign();
}

// -------------------------------------------------------
// 📡 1. 抓取逻辑 (点击“签到领取”瞬间触发)
// -------------------------------------------------------
function CaptureCapacitySign() {
    const url = $request.url;
    const headers = $request.headers;
    const body = $request.body;

    if (url && headers && body) {
        // 保存克隆三要素：URL(含 psign)、Headers(含 Cookie)、Body(含 authCode)
        $.setdata(url, KEY_URL);
        $.setdata(JSON.stringify(headers), KEY_HEADERS);
        $.setdata(body, KEY_BODY);

        $.msg($.name, "✅ 抓取成功", "已完美克隆容量签到数据包，请前往 QX 手动运行测试！");
        console.log(`✅ [两步路] 成功捕获 URL: ${url}`);
        console.log(`✅ [两步路] 成功捕获 Body: ${body}`);
    } else {
        console.log(`⚠️ [两步路] 抓取失败，缺少必要数据`);
    }
    $done({});
}

// -------------------------------------------------------
// 🚀 2. 无损回放签到逻辑
// -------------------------------------------------------
function ExecuteCapacitySign() {
    const savedUrl = $.getdata(KEY_URL);
    const savedHeadersStr = $.getdata(KEY_HEADERS);
    const savedBody = $.getdata(KEY_BODY);

    if (!savedUrl || !savedHeadersStr || !savedBody) {
        $.msg($.name, "🚫 缺少数据", "请先前往两步路 App -> 我的 -> 存储空间管理，点击黄色的‘签到领取’按钮进行抓包。");
        $done(); return;
    }

    let headers = {};
    try {
        headers = JSON.parse(savedHeadersStr);
        // 清理可能导致强行阻断的 Header，保留 Cookie 和 Encrypt-Type
        delete headers['Content-Length'];
        delete headers['content-length'];
        delete headers['Accept-Encoding'];
    } catch (e) {
        console.log("❌ [两步路] Headers 解析失败");
        $done(); return;
    }

    console.log(">>> 正在执行两步路容量领取任务...");
    
    const signOpts = {
        url: savedUrl,
        method: "POST",
        headers: headers,
        body: savedBody
    };

    $task.fetch(signOpts).then(response => {
        try {
            const res = JSON.parse(response.body);
            // {"code":0, "message":"success", "data":{...}}
            if (res.code == 0 || res.message === "success") {
                $.msg($.name, "✅ 领取成功", `恭喜！已成功领取 10M 存储空间。\n服务器反馈: ${res.message || "成功"}`);
            } else if (response.body.includes("重复") || response.body.includes("已经") || res.code == 10001) {
                $.msg($.name, "ℹ️ 重复领取", "您今天已经领取过 10M 容量了，明天再来吧！");
            } else {
                $.msg($.name, "⚠️ 领取反馈", res.message || "未知状态，请查看日志");
                console.log(`⚠️ [两步路] 异常返回: ${response.body}`);
            }
        } catch (e) {
            $.msg($.name, "❌ 解析异常", "接口返回格式错误，可能认证失效。");
            console.log(`❌ [两步路] 原始响应数据: ${response.body}`);
        }
        $done();
    }, reason => {
        $.msg($.name, "🚫 网络错误", reason.error);
        $done();
    });
}

// -------------------------------------------------------
// ⚙️ Env 环境类 (极简版)
// -------------------------------------------------------
function Env(t){return new class{constructor(t){this.name=t}msg(t,e,s){if("undefined"!=typeof $notify)$notify(t,e,s);console.log(`[${t}] ${e} - ${s}`)}setdata(t,e){return"undefined"!=typeof $prefs?$prefs.setValueForKey(t,e):"undefined"!=typeof $persistentStore?$persistentStore.write(t,e):void 0}getdata(t){return"undefined"!=typeof $prefs?$prefs.valueForKey(t):"undefined"!=typeof $persistentStore?$persistentStore.read(t):void 0}done(){"undefined"!=typeof $done&&$done({})}}(t)}
