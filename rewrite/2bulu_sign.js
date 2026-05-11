/*
项目名称：两步路户外助手自动签到 (高频验证版)
更新说明：采用抓包+两步验证机制，规避每日一次的测试限制，确保一次成功。

================ Quantumult X 配置指南 ================
[MITM]
hostname = *.2bulu.com, api.2bulu.com

[rewrite_local]
# 拦截个人信息接口获取凭证 (打开 App 进入“我的”页面触发)
^https:\/\/api\.2bulu\.com\/user\/info url script-request-header https://raw.githubusercontent.com/duoxiong/Quantumult-X/refs/heads/main/rewrite/2bulu_sign.js

[task_local]
# 每天早上 9:00 执行一次签到
0 9 * * * https://raw.githubusercontent.com/duoxiong/Quantumult-X/refs/heads/main/rewrite/2bulu_sign.js, tag=两步路签到, enabled=true
=======================================================
*/

const $ = new Env("两步路签到");

const KEY_AUTH = "duoxiong_2bulu_auth";
const KEY_HEADERS = "duoxiong_2bulu_headers";

// -------------------------------------------------------
// ⚙️ 核心接口配置
// -------------------------------------------------------
const URL_INFO = "https://api.2bulu.com/user/info";       // 第一步：用于测试 Token 的接口 (可无限重复)
const URL_SIGN = "https://api.2bulu.com/point/sign_in";   // 第二步：真正的签到接口

// -------------------------------------------------------
// 🚦 逻辑入口
// -------------------------------------------------------
if (typeof $request !== 'undefined') {
    CaptureToken();
} else {
    RunTwoSteps();
}

// -------------------------------------------------------
// 📡 1. 抓取逻辑 (打开“我的”页面触发)
// -------------------------------------------------------
function CaptureToken() {
    if ($request.headers) {
        // 保存所有原生 Headers
        $.setdata(JSON.stringify($request.headers), KEY_HEADERS);
        $.msg($.name, "✅ 抓取成功", "已捕获个人中心凭证，现在可前往 QX 任务列表手动运行测试！");
        console.log(`✅ [两步路] 凭证抓取成功: ${$request.url}`);
    }
    $done({});
}

// -------------------------------------------------------
// 🚀 2. 两步验证与运行逻辑
// -------------------------------------------------------
function RunTwoSteps() {
    const headersStr = $.getdata(KEY_HEADERS);
    if (!headersStr) {
        $.msg($.name, "🚫 缺少凭证", "请先打开两步路 App，进入‘我的’页面进行抓包。");
        $done(); return;
    }

    let baseHeaders = {};
    try {
        baseHeaders = JSON.parse(headersStr);
        // 清理可能导致网络请求报错的冲突 Header
        delete baseHeaders['Content-Length'];
        delete baseHeaders['content-length'];
        delete baseHeaders['Accept-Encoding'];
    } catch (e) {
        console.log("❌ [两步路] Headers 解析失败");
        $done(); return;
    }

    // --- 第一步：测试性获取积分余额 ---
    console.log(">>> 步骤 1: 正在验证 Token 有效性并获取当前积分...");
    const infoOpts = { 
        url: URL_INFO, 
        method: "GET",
        headers: baseHeaders 
    };
    
    $task.fetch(infoOpts).then(response => {
        try {
            const res = JSON.parse(response.body);
            if (res.code == 0 || res.data) {
                const points = res.data.userPoint !== undefined ? res.data.userPoint : "未知";
                console.log(`✅ Token 验证有效！当前积分: ${points}`);
                
                // --- 第二步：验证成功，执行真正的签到 ---
                ExecuteSignIn(baseHeaders, points);
            } else {
                $.msg($.name, "❌ Token 验证失败", "凭证可能已失效，请重新打开 App 刷新‘我的’页面。");
                console.log(`❌ [两步路] 验证返回: ${response.body}`);
                $done();
            }
        } catch (e) {
            $.msg($.name, "❌ 验证请求异常", "无法解析服务器响应数据。");
            console.log(`❌ [两步路] 网络数据: ${response.body}`);
            $done();
        }
    }, reason => {
        $.msg($.name, "🚫 网络超时或错误", reason.error);
        $done();
    });
}

// -------------------------------------------------------
// 🎯 3. 真正执行签到
// -------------------------------------------------------
function ExecuteSignIn(headers, currentPoints) {
    console.log(">>> 步骤 2: 正在执行每日签到...");
    const signOpts = {
        url: URL_SIGN,
        method: "POST", 
        headers: headers,
        body: "" // 签到接口通常只需 POST 空 Body 即可，鉴权在 Header
    };

    $task.fetch(signOpts).then(response => {
        try {
            const res = JSON.parse(response.body);
            // 兼容多种成功状态标识
            if (res.code == 0 || res.message === "success" || res.msg === "success") {
                $.msg($.name, "✅ 签到成功", `当前积分: ${currentPoints}\n反馈详情: ${res.message || res.msg || "任务完成"}`);
            } else if (response.body.includes("重复") || response.body.includes("已经")) {
                $.msg($.name, "ℹ️ 重复签到", `当前积分: ${currentPoints}\n提示信息: 您今天已经签到过了。`);
            } else {
                $.msg($.name, "⚠️ 签到异常", res.message || res.msg || "请进入 QX 查看具体日志");
                console.log(`⚠️ [两步路] 签到报错原文: ${response.body}`);
            }
        } catch (e) {
            $.msg($.name, "❌ 签到解析异常", "签到接口返回非 JSON 数据，可能接口已变更。");
            console.log(`❌ [两步路] 签到原始数据: ${response.body}`);
        }
        $done();
    }, reason => {
        $.msg($.name, "🚫 签到网络错误", reason.error);
        $done();
    });
}

// -------------------------------------------------------
// ⚙️ Env 环境类 (单文件无依赖极简版)
// -------------------------------------------------------
function Env(t){return new class{constructor(t){this.name=t}msg(t,e,s){if("undefined"!=typeof $notify)$notify(t,e,s);console.log(`[${t}] ${e} - ${s}`)}setdata(t,e){return"undefined"!=typeof $prefs?$prefs.setValueForKey(t,e):"undefined"!=typeof $persistentStore?$persistentStore.write(t,e):void 0}getdata(t){return"undefined"!=typeof $prefs?$prefs.valueForKey(t):"undefined"!=typeof $persistentStore?$persistentStore.read(t):void 0}done(){"undefined"!=typeof $done&&$done({})}}(t)}
