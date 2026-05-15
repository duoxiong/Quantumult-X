/**
 * 脚本名称：什么值得买 (SMZDM) 自动签到
 * 适用环境：Quantumult X
 * * --- 配合 QuanX 的本地配置文件使用说明 ---
 * * [rewrite_local]
 * # 1. 获取 Cookie (开启此规则后，打开什么值得买 App 即可触发)
 * ^https?:\/\/user-api\.smzdm\.com\/.* url script-request-header smzdm_qx.js
 * * [task_local]
 * # 2. 定时签到 (每天早上 9:00 执行一次)
 * 0 9 * * * smzdm_qx.js, tag=什么值得买签到, img-url=https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color/smzdm.png, enabled=true
 * * [MITM]
 * hostname = user-api.smzdm.com
 */

const cookieKey = "smzdm_cookie_qx";

// 根据运行环境自动判断是获取 Cookie 还是执行签到任务
if (typeof $request !== "undefined") {
    getCookie();
} else {
    checkIn();
}

// ==========================================
// 1. 获取 Cookie (Rewrite 触发)
// ==========================================
function getCookie() {
    const headers = $request.headers;
    // 兼容不同情况下的字段大小写
    const cookie = headers["Cookie"] || headers["cookie"];

    // 判断是否包含核心凭证 "sess="
    if (cookie && cookie.indexOf("sess=") !== -1) {
        const isSuccess = $prefs.setValueForKey(cookie, cookieKey);
        if (isSuccess) {
            $notify("什么值得买", "成功获取 Cookie 🎉", "已经保存到本地，现在可以关闭重写规则，并去设置定时任务了！");
            console.log("SMZDM Cookie 获取成功: " + cookie);
        } else {
            $notify("什么值得买", "获取 Cookie 失败 ❌", "请检查 QuanX 的本地存储情况或重试。");
        }
    } else {
        console.log("SMZDM 请求中未找到有效的 sess 凭证。");
    }
    // 放行请求，不影响 App 正常使用
    $done({});
}

// ==========================================
// 2. 执行签到 (Task 触发)
// ==========================================
function checkIn() {
    const cookie = $prefs.valueForKey(cookieKey);
    if (!cookie) {
        $notify("什么值得买", "签到失败 ❌", "未找到 Cookie，请先在本地配置中开启 Rewrite 规则，然后打开一次 App 获取！");
        $done();
        return;
    }

    // 核心逻辑：使用 App 端抓取的 Cookie 去请求 Web 端的签到接口，绕过 App 端的强校验 (sign/time)
    const request = {
        url: "https://zhiyou.smzdm.com/user/checkin/jsonp_checkin",
        method: "GET",
        headers: {
            "Cookie": cookie,
            "Referer": "https://www.smzdm.com/",
            "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1"
        }
    };

    $task.fetch(request).then(response => {
        try {
            const result = JSON.parse(response.body);

            // error_code 为 0 表示成功
            if (result.error_code === 0) {
                const days = result.data.checkin_num || "未知";
                const gold = result.data.gold || "0";
                const exp = result.data.exp || "0";
                $notify("什么值得买", "签到成功 ✅", `连续签到: ${days}天\n获得奖励: ${gold}金币 | ${exp}经验`);
                console.log(`SMZDM 签到成功: 连续 ${days} 天, 奖励 ${gold}金币`);
            } 
            // 包含 "已经签到" 字样
            else if (result.error_msg && result.error_msg.includes("已经签到")) {
                $notify("什么值得买", "今日已签到 ⚠️", "今天已经签过到了，明天再来吧！");
                console.log("SMZDM 重复签到: 今日已完成签到");
            } 
            // 其他错误（可能是 Cookie 失效）
            else {
                $notify("什么值得买", "签到失败 ❌", `错误信息: ${result.error_msg || "未知错误，可能是 Cookie 已失效"}`);
                console.log("SMZDM 签到失败，接口返回: " + response.body);
            }
        } catch (e) {
            console.log(`SMZDM 返回数据解析异常: ${response.body}`);
            console.log(`异常信息: ${e}`);
            $notify("什么值得买", "解析异常 ❌", "接口返回数据格式发生变动，请查看 QuanX 日志。");
        }
        $done();
    }, reason => {
        console.log(`SMZDM 请求失败: ${reason.error}`);
        $notify("什么值得买", "网络请求失败 ❌", `错误信息: ${reason.error}`);
        $done();
    });
}
