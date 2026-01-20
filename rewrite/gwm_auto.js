/*
脚本名称：长城汽车自动签到 (QuanX 专版)
更新时间：2024-05-20
说明：剔除冗余代码，仅针对 Quantumult X 优化
仓库路径：https://raw.githubusercontent.com/duoxiong/Quantumult-X/refs/heads/main/rewrite/gwm_auto.js

[rewrite_local]
# 匹配 v1, v2, v3 等任意版本接口
^https:\/\/app-api\.gwm\.com\.cn\/app\/v.*?\/user\/info url script-response-body https://raw.githubusercontent.com/duoxiong/Quantumult-X/refs/heads/main/rewrite/gwm_auto.js

[task_local]
15 9 * * * https://raw.githubusercontent.com/duoxiong/Quantumult-X/refs/heads/main/rewrite/gwm_auto.js, tag=长城汽车签到, enabled=true
*/

const scriptName = "长城汽车签到";
const tokenKey = "gwm_token";
const debug = false; // 需要调试日志请改为 true

// ================= 主逻辑 =================
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

// ================= 功能函数 =================

// 核心：抓取 Token
async function captureToken() {
    console.log(`🔔 [${scriptName}] 开始捕获 Token...`);
    let capturedToken = null;
    let userName = "";

    try {
        // 1. 尝试从响应体获取 (最准确)
        if ($response.body) {
            const body = JSON.parse($response.body);
            if (body.data && body.data.token) {
                capturedToken = body.data.token;
                console.log("✅ 从响应体获取到 Token");
            }
            if (body.data && (body.data.userName || body.data.nickName)) {
                userName = body.data.userName || body.data.nickName;
            }
        }

        // 2. 尝试从请求头获取 (备用)
        if (!capturedToken && $request.headers) {
            // 兼容 header key 大小写
            const headers = Object.keys($request.headers).reduce((acc, key) => {
                acc[key.toLowerCase()] = $request.headers[key];
                return acc;
            }, {});
            
            const keys = ['authorization', 'token', 'x-token', 'gwm-token'];
            for (let key of keys) {
                if (headers[key]) {
                    capturedToken = headers[key];
                    console.log(`✅ 从 Header[${key}] 获取到 Token`);
                    break;
                }
            }
        }

        // 3. 保存逻辑
        if (capturedToken) {
            const oldToken = $.read(tokenKey);
            if (capturedToken !== oldToken) {
                $.write(capturedToken, tokenKey);
                $.notify(scriptName, "🎉 Token 获取成功", `用户: ${userName || '未知'}\n已保存并准备签到`);
                console.log(`Token 更新成功: ${capturedToken.substring(0, 10)}...`);
            } else {
                console.log("ℹ️ Token 未变化，跳过保存");
            }
        } else {
            console.log("❌ 未能提取到有效 Token");
        }
    } catch (e) {
        console.log(`❌ 捕获出错: ${e}`);
    }
}

// 核心：执行任务
async function runTask() {
    const rawTokens = $.read(tokenKey);
    if (!rawTokens) {
        $.notify(scriptName, "❌ 无法执行", "请先去 App 点击“我的”页面获取 Token");
        return;
    }

    const tokens = rawTokens.split('@').filter(t => t.length > 5);
    console.log(`检测到 ${tokens.length} 个账号`);

    let message = [];
    
    for (let i = 0; i < tokens.length; i++) {
        console.log(`\n➤ 开始执行账号 ${i + 1}`);
        const currentToken = tokens[i];
        
        // 1. 查询用户信息
        const user = await getUserInfo(currentToken);
        let log = `账号: ${user.name}`;
        
        // 2. 执行签到
        if (user.valid) {
            const signRes = await signIn(currentToken);
            log += ` | 结果: ${signRes}`;
        } else {
            log += ` | 状态: ❌ Token 失效`;
        }
        
        console.log(log);
        message.push(log);
        
        // 随机延迟 2-4 秒防封
        if (i < tokens.length - 1) await $.wait(Math.floor(Math.random() * 2000 + 2000));
    }
    
    if (message.length > 0) {
        $.notify(scriptName, "签到执行完毕", message.join("\n"));
    }
}

// 接口：用户信息
function getUserInfo(token) {
    return new Promise(resolve => {
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
                    resolve({ valid: false, name: "未知" });
                }
            } catch (e) {
                resolve({ valid: false, name: "解析失败" });
            }
        }, () => resolve({ valid: false, name: "网络错误" }));
    });
}

// 接口：签到
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
                    resolve(`✅ 成功 (+${points}分)`);
                } else if (JSON.stringify(body).includes("重复")) {
                    resolve(`⚠️ 今日已签`);
                } else {
                    resolve(`❌ ${body.message || "失败"}`);
                }
            } catch (e) {
                resolve(`❌ 异常`);
            }
        }, () => resolve(`❌ 网络错误`));
    });
}

function hidePhone(str) {
    if (!str || str.length < 7) return "车主";
    return str.substring(0, 3) + "****" + str.substring(str.length - 4);
}

// ================= QuanX 原生工具库 (极简版) =================
function initQuanX() {
    return {
        read: (key) => $prefs.valueForKey(key),
        write: (val, key) => $prefs.setValueForKey(val, key),
        notify: (title, subtitle, msg) => $notify(title, subtitle, msg),
        get: (url) => $task.fetch({ ...url, method: 'GET' }),
        fetch: (url) => $task.fetch(url), // 通用 fetch
        wait: (ms) => new Promise(r => setTimeout(r, ms)),
        done: (val) => $done(val)
    };
}
