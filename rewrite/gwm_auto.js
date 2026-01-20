/*
脚本名称：长城汽车自动签到 (2025新域名修复版)
更新时间：2024-05-20
说明：针对 gwmapp-h.com 等新域名优化，仅限 Quantumult X 使用
仓库路径：https://raw.githubusercontent.com/duoxiong/Quantumult-X/refs/heads/main/rewrite/gwm_auto.js

[rewrite_local]
# 核心修复：匹配 gwmapp-h / gwmcloudcn / haval / tank 等所有可能的新域名
^https?:\/\/.*(gwmapp-h|gwmcloudcn|gwm|haval|tank).*\.com.*\/.*user\/info url script-response-body https://raw.githubusercontent.com/duoxiong/Quantumult-X/refs/heads/main/rewrite/gwm_auto.js

[task_local]
15 9 * * * https://raw.githubusercontent.com/duoxiong/Quantumult-X/refs/heads/main/rewrite/gwm_auto.js, tag=长城汽车签到, enabled=true
*/

const scriptName = "长城汽车签到";
const tokenKey = "gwm_token";

// ================= 主逻辑入口 =================
const $ = initQuanX();

(async () => {
    // 场景1：重写捕获 Token
    if (typeof $request !== "undefined") {
        await captureToken();
        $.done();
        return;
    }

    // 场景2：定时任务执行
    await runTask();
    $.done();
})();

// ================= 核心功能函数 =================

// 1. 抓取 Token (支持请求头和响应体双重检测)
async function captureToken() {
    console.log(`🔔 [${scriptName}] 捕获触发 URL: ${$request.url}`);
    let capturedToken = null;
    let userName = "";

    try {
        // A. 优先尝试从响应体获取 (准确率最高)
        if ($response.body) {
            try {
                const body = JSON.parse($response.body);
                // 适配不同接口返回结构
                if (body.data && body.data.token) {
                    capturedToken = body.data.token;
                    console.log("✅ [Body] 成功提取 Token");
                }
                // 顺便提取用户名
                if (body.data) {
                    userName = body.data.userName || body.data.nickName || body.data.name || "";
                }
            } catch (e) {
                // 忽略非 JSON 响应
            }
        }

        // B. 备用尝试从请求头获取
        if (!capturedToken && $request.headers) {
            // 兼容 header key 大小写 (Authorization / token / x-token)
            const headers = Object.keys($request.headers).reduce((acc, key) => {
                acc[key.toLowerCase()] = $request.headers[key];
                return acc;
            }, {});
            
            const keys = ['authorization', 'token', 'x-token', 'gwm-token'];
            for (let key of keys) {
                if (headers[key] && headers[key].length > 20) { // 简单过滤过短的无效值
                    capturedToken = headers[key];
                    console.log(`✅ [Header] 成功提取 Token (${key})`);
                    break;
                }
            }
        }

        // C. 保存逻辑
        if (capturedToken) {
            const oldToken = $.read(tokenKey);
            if (capturedToken !== oldToken) {
                const saveResult = $.write(capturedToken, tokenKey);
                if (saveResult) {
                    $.notify(scriptName, "🎉 Token 获取成功", `用户: ${userName || '车主'}\n数据已更新，下次任务生效`);
                    console.log(`🎉 Token 更新成功: ${capturedToken.substring(0, 15)}...`);
                } else {
                    console.log("❌ Token 写入失败 (存储空间满或权限不足)");
                }
            } else {
                console.log("ℹ️ Token 未发生变化，跳过通知");
            }
        } else {
            console.log("⚠️ 本次请求未发现有效 Token (可能是登录失效或接口结构变更)");
        }
    } catch (e) {
        console.log(`❌ 捕获逻辑异常: ${e}`);
    }
}

// 2. 执行签到任务
async function runTask() {
    const rawTokens = $.read(tokenKey);
    if (!rawTokens) {
        $.notify(scriptName, "❌ 无法执行", "请先打开 APP -> 点击“我的”页面，等待脚本自动抓取 Token");
        console.log("❌ 无 Token 数据");
        return;
    }

    // 支持多账号 (虽然目前逻辑主要针对单账号覆盖)
    const tokens = rawTokens.split('@').filter(t => t.length > 10);
    console.log(`✅ 检测到 ${tokens.length} 个 Token`);

    let message = [];
    
    for (let i = 0; i < tokens.length; i++) {
        const currentToken = tokens[i];
        console.log(`\n➤ 执行第 ${i + 1} 个账号`);
        
        // 查询信息
        const user = await getUserInfo(currentToken);
        let logStr = `账号: ${user.name}`;
        
        // 执行签到
        if (user.valid) {
            const signRes = await signIn(currentToken);
            logStr += `\n结果: ${signRes}`;
        } else {
            logStr += `\n状态: ❌ Token 已失效，请重新获取`;
        }
        
        console.log(logStr);
        message.push(logStr);
        
        // 随机延迟防止风控
        if (i < tokens.length - 1) await $.wait(Math.floor(Math.random() * 2000 + 2000));
    }
    
    if (message.length > 0) {
        $.notify(scriptName, "签到执行完毕", message.join("\n\n"));
    }
}

// ================= API 接口请求 =================

function getUserInfo(token) {
    return new Promise(resolve => {
        // 尝试使用 v1 接口，如果未来变动可修改此处
        const url = {
            url: "https://app-api.gwm.com.cn/app/v1/user/info",
            headers: {
                "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 GWMBrand/8.0.0",
                "Authorization": token
            }
        };
        $.get(url).then(response => {
            try {
                const body = JSON.parse(response.body);
                if (body.code === 200 && body.data) {
                    resolve({ 
                        valid: true, 
                        name: body.data.userName || body.data.nickName || hidePhone(body.data.mobile) 
                    });
                } else {
                    resolve({ valid: false, name: "未知/失效" });
                }
            } catch (e) {
                resolve({ valid: false, name: "解析失败" });
            }
        }, () => resolve({ valid: false, name: "网络错误" }));
    });
}

function signIn(token) {
    return new Promise(resolve => {
        const url = {
            url: "https://app-api.gwm.com.cn/app/v1/activity/sign_in",
            method: "POST",
            headers: {
                "Content-Type": "application/json;charset=utf-8",
                "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 GWMBrand/8.0.0",
                "Authorization": token
            },
            body: JSON.stringify({})
        };
        $.fetch(url).then(response => {
            try {
                const body = JSON.parse(response.body);
                if (body.code === 200 || body.success) {
                    const points = body.data?.points || body.data?.reward || 0;
                    const msg = body.data?.message || "";
                    resolve(`✅ 成功 (+${points}分) ${msg}`);
                } else if (JSON.stringify(body).includes("重复")) {
                    resolve(`⚠️ 今日已签过`);
                } else {
                    resolve(`❌ ${body.message || "未知错误"}`);
                }
            } catch (e) {
                resolve(`❌ 响应解析异常`);
            }
        }, () => resolve(`❌ 网络请求失败`));
    });
}

// 辅助：手机号脱敏
function hidePhone(str) {
    if (!str || str.length < 7) return "车主";
    return str.substring(0, 3) + "****" + str.substring(str.length - 4);
}

// ================= Quantumult X 原生工具库 (极简版) =================
function initQuanX() {
    return {
        read: (key) => $prefs.valueForKey(key),
        write: (val, key) => $prefs.setValueForKey(val, key),
        notify: (title, subtitle, msg) => $notify(title, subtitle, msg),
        get: (url) => $task.fetch({ ...url, method: 'GET' }),
        fetch: (url) => $task.fetch(url),
        wait: (ms) => new Promise(r => setTimeout(r, ms)),
        done: (val) => $done(val)
    };
}
