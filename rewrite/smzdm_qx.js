/*
[rewrite_local]
# 获取什么值得买 Cookie (打开 App 自动触发)
^https?:\/\/user-api\.smzdm\.com\/.* url script-request-header smzdm_qx.js

[task_local]
# 定时签到 (每天上午 9:00 执行)
0 9 * * * smzdm_qx.js, tag=什么值得买签到, img-url=https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color/smzdm.png, enabled=true

[MITM]
hostname = user-api.smzdm.com
*/

const cookieKey = "smzdm_cookie_qx";

// 识别当前是 Rewrite 触发还是 Task 触发
if (typeof $request !== "undefined") {
    getCookie();
} else {
    checkIn();
}

// ==========================================
// 1. 获取 Cookie (Rewrite)
// ==========================================
function getCookie() {
    const headers = $request.headers;
    // 兼容大小写
    const cookie = headers["Cookie"] || headers["cookie"];

    // 只要包含 sess，就是有效凭证
    if (cookie && cookie.indexOf("sess=") !== -1) {
        const isSuccess = $prefs.setValueForKey(cookie, cookieKey);
        if (isSuccess) {
            $notify("什么值得买", "成功获取 Cookie 🎉", "已经保存到本地，可关闭抓包规则并去设置定时任务。");
        } else {
            $notify("什么值得买", "获取 Cookie 失败 ❌", "请检查 QuanX 存储或重试。");
        }
    }
    $done({});
}

// ==========================================
// 2. 执行签到 (Task)
// ==========================================
function checkIn() {
    const cookie = $prefs.valueForKey(cookieKey);
    if (!cookie) {
        $notify("什么值得买", "签到失败 ❌", "未找到 Cookie，请先开启 Rewrite 规则并打开 App 获取！");
        $done();
        return;
    }

    // 核心思路：利用 App 获取的 Cookie，请求网页端的签到接口，完美绕过 sign 校验
    const request = {
        url: "https://zhiyou.smzdm.com/user/checkin/jsonp_checkin",
        method: "GET",
        headers: {
            "Cookie": cookie,
            "Referer": "https://www.smzdm.com/",
            // 伪装成浏览器 User-Agent
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36"
        }
    };

    $task.fetch(request).then(response => {
        try {
            const result = JSON.parse(response.body);

            // error_code 为 0 表示签到成功
            if (result.error_code === 0) {
                const days = result.data.checkin_num || "未知";
                const gold = result.data.gold || "0";
                const exp = result.data.exp || "0";
                $notify("什么值得买", "签到成功 ✅", `连续签到: ${days}天\n获得奖励: ${gold}金币 | ${exp}经验`);
            } 
            // 很多平台会用其他 code 表示已经签到过
            else if (result.error_msg && result.error_msg.includes("已经签到")) {
                $notify("什么值得买", "重复签到 ⚠️", "今天已经签到过啦，明天再来吧。");
            }
            else {
                $notify("什么值得买", "签到结果", `提示信息: ${result.error_msg}`);
            }
        } catch (e) {
            console.log(`SMZDM 返回数据解析失败: ${response.body}`);
            $notify("什么值得买", "解析异常 ❌", `接口返回数据格式变动，请查看日志。`);
        }
        $done();
    }, reason => {
        $notify("什么值得买", "请求失败 ❌", `网络请求错误: ${reason.error}`);
        $done();
    });
}
