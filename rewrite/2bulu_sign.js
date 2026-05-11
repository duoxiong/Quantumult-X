/*
项目名称：两步路户外助手 - 自动签到 (两步验证版)
更新说明：采用抓包+两步验证机制，规避每日一次的测试限制。

================ Quantumult X 配置指南 ================
请将下方配置分别添加到 Quantumult X 对应的模块中：

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

// ---------------------- 核心接口 ----------------------
const URL_INFO = "https://api.2bulu.com/user/info";       // 第一步：用于测试 Token 的接口 (可无限重复)
const URL_SIGN = "https://api.2bulu.com/point/sign_in";   // 第二步：真正的签到接口

if (typeof $request !== 'undefined') {
    CaptureToken();
} else {
    RunTwoSteps();
}

// ---------------------- 1. 抓取逻辑 (可重复测试) ----------------------
function CaptureToken() {
    if ($request.headers) {
        // 保存所有 Headers，两步路通常把 Token 放在 Header 里
        $.setdata(JSON.stringify($request.headers), KEY_HEADERS);
        $.msg($.name, "✅ 抓取成功", "已捕获个人中心凭证，现在可前往 QX 手动运行脚本测试！");
        console.log(`[两步路] 凭证抓取成功: ${$request.url}`);
    }
    $.done();
}

// ---------------------- 2. 两步走运行逻辑 ----------------------
async function RunTwoSteps() {
    const headersStr = $.getdata(KEY_HEADERS);
    if (!headersStr) {
        $.msg($.name, "🚫 缺少凭证", "请先打开两步路 App 的‘我的’页面进行抓包。");
        $.done(); return;
    }

    let baseHeaders = {};
    try {
        baseHeaders = JSON.parse(headersStr);
        // 清理可能导致网络请求报错的 Header
        delete baseHeaders['Content-Length'];
        delete baseHeaders['content-length'];
        delete baseHeaders['Accept-Encoding'];
    } catch (e) {
        console.log("[两步路] Headers 解析失败");
        $.done(); return;
    }

    // --- 第一步：测试性获取积分余额 (用来代替签到测试) ---
    console.log(">>> 步骤 1: 正在验证 Token 有效性并获取积分...");
    const infoOpts = { url: URL_INFO, headers: baseHeaders };
    
    $.get(infoOpts, (err, resp, data) => {
        try {
            const res = JSON.parse(data);
            if (res.code == 0 || res.data) {
                const points = res.data.userPoint !== undefined ? res.data.userPoint : "未知";
                console.log(`✅ Token 有效！当前积分: ${points}`);
                
                // --- 第二步：既然第一步通了，执行真正的签到 ---
                ExecuteSignIn(baseHeaders, points);
            } else {
                $.msg($.name, "❌ Token 验证失败", "凭证可能已失效，请重新打开 App 刷新‘我的’页面抓包。");
                console.log(`[两步路] 验证返回: ${data}`);
                $.done();
            }
        } catch (e) {
            $.msg($.name, "❌ 验证请求异常", "无法连接两步路服务器或返回非 JSON。");
            console.log(`[两步路] 网络数据: ${data}`);
            $.done();
        }
    });
}

// ---------------------- 3. 真正执行签到 ----------------------
function ExecuteSignIn(headers, currentPoints) {
    console.log(">>> 步骤 2: 正在执行每日签到...");
    const signOpts = {
        url: URL_SIGN,
        method: "POST", // 签到通常是 POST
        headers: headers,
        body: "" 
    };

    $.post(signOpts, (err, resp, data) => {
        try {
            const res = JSON.parse(data);
            if (res.code == 0 || res.message === "success" || res.msg === "success") {
                $.msg($.name, "✅ 签到成功", `原有积分: ${currentPoints}\n反馈: ${res.message || res.msg || "任务完成"}`);
            } else if (data.includes("重复") || data.includes("已经")) {
                $.msg($.name, "ℹ️ 重复签到", `原有积分: ${currentPoints}\n提示: 今日已经签到过了哦。`);
            } else {
                $.msg($.name, "⚠️ 签到异常", res.message || res.msg || "请检查日志");
                console.log(`[两步路] 签到报错原文: ${data}`);
            }
        } catch (e) {
            $.msg($.name, "❌ 签到解析异常", "签到接口返回非 JSON 数据");
            console.log(`[两步路] 签到原始数据: ${data}`);
        }
        $.done();
    });
}

// ---------------------- Env 环境类 (精简版) ----------------------
function Env(t){return new class{constructor(t){this.name=t}getdata(t){return $prefs.valueForKey(t)}setdata(t,e){return $prefs.setValueForKey(t,e)}msg(t,e,s){$notify(t,e,s)}get(t,e){t.method="GET";$task.fetch(t).then(t=>e(null,t,t.body),t=>e(t.error))}post(t,e){t.method="POST";$task.fetch(t).then(t=>e(null,t,t.body),t=>e(t.error))}done(){$done({})}}(t)}
