/*
项目名称：两步路户外助手 - 存储空间自动签到扩容
更新说明：专为“签到领取 10M”任务定制，精准抓取 POST 请求体并实现无损重放。

================ Quantumult X 配置指南 ================
[MITM]
hostname = helper.2bulu.com

[rewrite_local]
^https:\/\/helper\.2bulu\.com\/dataSpace\/claimCapacity url script-request-body https://raw.githubusercontent.com/duoxiong/Quantumult-X/refs/heads/main/rewrite/2bulu_space.js

[task_local]
15 9 * * * https://raw.githubusercontent.com/duoxiong/Quantumult-X/refs/heads/main/rewrite/2bulu_space.js, tag=两步路空间扩容, enabled=true
=======================================================
*/

const $ = new Env("两步路空间扩容");

const KEY_URL = "duoxiong_2bulu_space_url";
const KEY_HEADERS = "duoxiong_2bulu_space_headers";
const KEY_BODY = "duoxiong_2bulu_space_body";

if (typeof $request !== 'undefined') {
    CaptureCapacity();
} else {
    ClaimCapacity();
}

// -------------------------------------------------------
// 📡 1. 抓取逻辑 (点击“签到领取”按钮触发)
// -------------------------------------------------------
function CaptureCapacity() {
    const url = $request.url;
    
    if (url.includes("claimCapacity")) {
        const headers = $request.headers;
        const body = $request.body;
        
        if (body) {
            $.setdata(url, KEY_URL);
            $.setdata(JSON.stringify(headers), KEY_HEADERS);
            $.setdata(body, KEY_BODY);
            
            $.msg($.name, "✅ 抓取成功", "空间扩容凭证及 Body 已保存，可前往 QX 任务列表手动运行测试！");
            console.log(`✅ [两步路空间] 抓取 URL: ${url}`);
            console.log(`✅ [两步路空间] 抓取 Body: ${body}`);
        } else {
            console.log("⚠️ [两步路空间] 拦截到请求，但未获取到 Body，请确保开启了 script-request-body");
        }
    }
    $done({});
}

// -------------------------------------------------------
// 🚀 2. 自动领取逻辑
// -------------------------------------------------------
function ClaimCapacity() {
    const url = $.getdata(KEY_URL);
    const headersStr = $.getdata(KEY_HEADERS);
    const body = $.getdata(KEY_BODY);

    if (!url || !headersStr || !body) {
        $.msg($.name, "🚫 缺少凭证", "请先在两步路 App 中进入‘存储空间管理’，手动点击一次黄色的‘签到领取’按钮！");
        $done(); return;
    }

    let baseHeaders = {};
    try {
        baseHeaders = JSON.parse(headersStr);
        // 清理冲突 Header，防止报错或乱码
        delete baseHeaders['Content-Length'];
        delete baseHeaders['content-length'];
        delete baseHeaders['Accept-Encoding'];
    } catch (e) {
        console.log("❌ [两步路空间] Headers 解析失败");
        $done(); return;
    }

    console.log(">>> 正在执行存储空间领取...");
    const opts = {
        url: url,
        method: "POST",
        headers: baseHeaders,
        body: body
    };

    $task.fetch(opts).then(response => {
        try {
            const res = JSON.parse(response.body);
            // 两步路的扩容接口通常返回 code: 0 为成功
            if (res.code == 0 || res.success) {
                $.msg($.name, "✅ 领取成功", `反馈详情: ${res.message || res.msg || "10M 空间已到账！"}`);
            } else if (response.body.includes("重复") || response.body.includes("已经") || res.code == 500) {
                // 部分接口重复领取会抛出 500 或特定 message
                $.msg($.name, "ℹ️ 重复领取", `提示信息: 今日 10M 扩容任务已完成。\n服务器反馈: ${res.message || res.msg}`);
            } else {
                $.msg($.name, "⚠️ 领取异常", res.message || res.msg || "未知状态，请查看日志");
                console.log(`⚠️ [两步路空间] 报错原文: ${response.body}`);
            }
        } catch (e) {
            $.msg($.name, "❌ 解析异常", "接口返回非 JSON 数据，请检查网络。");
            console.log(`❌ [两步路空间] 原始数据: ${response.body}`);
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
