/*
项目名称：两步路户外助手 (动态抓包两步验证版)
更新说明：适配 helper.2bulu.com 新域名与 GET 请求的 URL 鉴权模式。自动捕获并分离“查询动作”和“执行动作”。

================ Quantumult X 配置指南 ================
[MITM]
hostname = helper.2bulu.com

[rewrite_local]
# 智能拦截：同时捕获“用户信息(用于验证)”和“收藏帖子(用于动作执行)”
^https:\/\/helper\.2bulu\.com\/(queryUserInfo|greenPea\/queryTasks|favorite\/addFavorite) url script-request-header https://raw.githubusercontent.com/duoxiong/Quantumult-X/refs/heads/main/rewrite/2bulu_sign.js

[task_local]
# 每天中午 12:00 执行测试
0 12 * * * https://raw.githubusercontent.com/duoxiong/Quantumult-X/refs/heads/main/rewrite/2bulu_sign.js, tag=两步路任务测试, enabled=true
=======================================================
*/

const $ = new Env("两步路自动化");

const KEY_HEADERS = "duoxiong_2bulu_headers";
const KEY_INFO_URL = "duoxiong_2bulu_info_url";     // 第一步的链接
const KEY_ACTION_URL = "duoxiong_2bulu_action_url"; // 第二步的链接

// -------------------------------------------------------
// 🚦 逻辑入口
// -------------------------------------------------------
if (typeof $request !== 'undefined') {
    CaptureUrls();
} else {
    RunTwoSteps();
}

// -------------------------------------------------------
// 📡 1. 智能抓取逻辑 (双重捕获)
// -------------------------------------------------------
function CaptureUrls() {
    const url = $request.url;
    
    // 捕获 Headers (作为基础环境)
    if ($request.headers) {
        $.setdata(JSON.stringify($request.headers), KEY_HEADERS);
    }

    // 捕获第一步：查询类接口 (刷新个人主页时触发)
    if (url.includes("queryUserInfo") || url.includes("queryTasks")) {
        $.setdata(url, KEY_INFO_URL);
        $.msg($.name, "✅ 验证接口抓取成功", "步骤 1 就绪：已锁定用户信息查询链接。");
        console.log(`✅ [两步路] 验证链接: ${url}`);
    }

    // 捕获第二步：动作类接口 (点击点赞/收藏时触发)
    if (url.includes("addFavorite")) {
        $.setdata(url, KEY_ACTION_URL);
        $.msg($.name, "✅ 动作接口抓取成功", "步骤 2 就绪：已锁定收藏动作链接。现在可手动运行脚本测试！");
        console.log(`✅ [两步路] 动作链接: ${url}`);
    }

    $done({});
}

// -------------------------------------------------------
// 🚀 2. 两步执行逻辑
// -------------------------------------------------------
function RunTwoSteps() {
    const headersStr = $.getdata(KEY_HEADERS);
    const infoUrl = $.getdata(KEY_INFO_URL);
    const actionUrl = $.getdata(KEY_ACTION_URL);

    if (!headersStr || !infoUrl || !actionUrl) {
        $.msg($.name, "🚫 数据不完整", "请回 App 完成两步操作：\n1. 刷新【我的】页面\n2. 去社区随意【收藏】一篇帖子");
        $done(); return;
    }

    let baseHeaders = {};
    try {
        baseHeaders = JSON.parse(headersStr);
        delete baseHeaders['Content-Length'];
        delete baseHeaders['content-length'];
        delete baseHeaders['Accept-Encoding'];
    } catch (e) {
        console.log("❌ [两步路] Headers 解析失败");
        $done(); return;
    }

    // --- 第一步：测试性获取个人信息 ---
    console.log(">>> 步骤 1: 正在验证 Token 并获取用户信息...");
    const infoOpts = { 
        url: infoUrl, 
        method: "GET",
        headers: baseHeaders 
    };
    
    $task.fetch(infoOpts).then(response => {
        try {
            const res = JSON.parse(response.body);
            if (res.code == 0 || res.code == 200 || res.data) {
                console.log(`✅ 步骤 1 验证通过！`);
                
                // 延迟 1 秒后执行第二步 (模拟人类操作)
                setTimeout(() => {
                    ExecuteAction(actionUrl, baseHeaders);
                }, 1000);

            } else {
                $.msg($.name, "❌ 步骤 1 验证失败", "链接可能已过期，请重新回 App 抓包。");
                console.log(`❌ [两步路] 验证返回: ${response.body}`);
                $done();
            }
        } catch (e) {
            $.msg($.name, "❌ 验证请求异常", "无法解析服务器响应数据。");
            $done();
        }
    }, reason => {
        $.msg($.name, "🚫 网络超时", reason.error);
        $done();
    });
}

// -------------------------------------------------------
// 🎯 3. 执行真实动作 (收藏/测试)
// -------------------------------------------------------
function ExecuteAction(actionUrl, headers) {
    console.log(">>> 步骤 2: 正在执行实战动作...");
    const actionOpts = {
        url: actionUrl,
        method: "GET", 
        headers: headers
    };

    $task.fetch(actionOpts).then(response => {
        try {
            const res = JSON.parse(response.body);
            // 这里无论返回“成功”还是“已收藏”，都代表我们的双端链路跑通了
            if (res.code == 0 || res.message === "success" || res.msg === "success") {
                $.msg($.name, "🎉 自动化测试完美通关", `两步链路已打通！\n反馈详情: ${res.message || res.msg || "动作执行成功"}`);
            } else {
                $.msg($.name, "ℹ️ 动作反馈", res.message || res.msg || "请求已发送");
                console.log(`ℹ️ [两步路] 动作原始数据: ${response.body}`);
            }
        } catch (e) {
            $.msg($.name, "❌ 动作解析异常", "接口返回非 JSON 数据。");
        }
        $done();
    }, reason => {
        $.msg($.name, "🚫 动作请求错误", reason.error);
        $done();
    });
}

// -------------------------------------------------------
// ⚙️ Env 环境类
// -------------------------------------------------------
function Env(t){return new class{constructor(t){this.name=t}msg(t,e,s){if("undefined"!=typeof $notify)$notify(t,e,s);console.log(`[${t}] ${e} - ${s}`)}setdata(t,e){return"undefined"!=typeof $prefs?$prefs.setValueForKey(t,e):"undefined"!=typeof $persistentStore?$persistentStore.write(t,e):void 0}getdata(t){return"undefined"!=typeof $prefs?$prefs.valueForKey(t):"undefined"!=typeof $persistentStore?$persistentStore.read(t):void 0}done(){"undefined"!=typeof $done&&$done({})}}(t)}
