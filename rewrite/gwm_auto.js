/*
脚本名称：长城/坦克汽车自动签到 (增强Token抓取版)
脚本作者：GWM_User
更新时间：2026-01-20
优化方向：增强Token抓取机制、详细日志、多重匹配策略

================ Quantumult X 配置 ================

[MITM]
hostname = app-api.gwm.com.cn, gateway.gwm.com.cn

[rewrite_local]

# 方案1: 拦截用户信息接口 (优先级最高)

^https://app-api.gwm.com.cn/app/v1/user/info url script-request-header https://raw.githubusercontent.com/duoxiong/Quantumult-X/refs/heads/main/rewrite/gwm_auto.js

# 方案2: 拦截登录接口 (备选)

^https://app-api.gwm.com.cn/app/v1/user/login url script-request-header https://raw.githubusercontent.com/duoxiong/Quantumult-X/refs/heads/main/rewrite/gwm_auto.js

# 方案3: 拦截首页接口 (备选)

^https://app-api.gwm.com.cn/app/v1/home url script-request-header https://raw.githubusercontent.com/duoxiong/Quantumult-X/refs/heads/main/rewrite/gwm_auto.js

[task_local]

# 每日 09:00 自动签到

0 9 * * * https://raw.githubusercontent.com/duoxiong/Quantumult-X/refs/heads/main/rewrite/gwm_auto.js, tag=长城汽车签到, enabled=true

*/

const $ = new Env(“长城汽车签到”);

// ============ 配置区域 ============
const GWM_TOKEN_KEY = ‘gwm_token’;
const GWM_HOST = ‘app-api.gwm.com.cn’;
const DEBUG_MODE = true;

const API_URL = {
sign: ‘/app/v1/activity/sign_in’
};

let gwm_token = ($.isNode() ? process.env[GWM_TOKEN_KEY] : $.getdata(GWM_TOKEN_KEY)) || ‘’;
let tokenArr = [];

!(async () => {
try {
if (typeof $request !== ‘undefined’) {
console.log(“🔔 检测到长城汽车网络请求，正在提取 Token…”);
console.log(“📍 请求URL: “ + $request.url);
GetToken();
return;
}

```
    console.log("\n🔔 " + $.name + " 脚本启动...");
    if (!await checkEnv()) return;
    
    for (let i = 0; i < tokenArr.length; i++) {
        let token = tokenArr[i];
        if (!token) continue;
        console.log("\n👤 [账号 " + (i + 1) + "] 开始执行...");
        await signIn(token);
        await $.wait(2000); 
    }
} catch(e) {
    console.log("❌ 错误: " + e.message);
    $.msg($.name, "脚本运行异常", e.message);
} finally {
    $.done();
}
```

})();

// ============ Token 抓取逻辑 ============
function GetToken() {
if (!$request) {
console.log(“❌ 未检测到请求对象”);
return;
}

```
let tokenVal = '';
const headers = $request.headers || {};

if (DEBUG_MODE) {
    console.log("📋 当前Headers列表:");
    for (let key in headers) {
        const displayVal = String(headers[key]).substring(0, 50);
        console.log("   [" + key + "]: " + displayVal);
    }
}

// 检查常见Header字段
const tokenKeys = ['authorization', 'x-access-token', 'x-auth-token', 'token', 'access-token', 'x-token'];

for (let i = 0; i < tokenKeys.length; i++) {
    let key = tokenKeys[i];
    for (let headerKey in headers) {
        if (headerKey.toLowerCase() === key) {
            const val = headers[headerKey];
            if (val && String(val).length > 10 && String(val).indexOf('null') === -1) {
                tokenVal = val;
                console.log("✅ 在Header [" + headerKey + "] 中发现Token");
                break;
            }
        }
    }
    if (tokenVal) break;
}

// 检查请求体
if (!tokenVal && $request.body) {
    try {
        let bodyData = {};
        if (typeof $request.body === 'string') {
            try {
                bodyData = JSON.parse($request.body);
            } catch (e) {
                console.log("⚠️ Body JSON解析失败");
            }
        } else {
            bodyData = $request.body;
        }

        if (DEBUG_MODE) {
            console.log("📄 请求体数据: " + JSON.stringify(bodyData).substring(0, 100));
        }

        for (let key in bodyData) {
            if (key.toLowerCase().indexOf('token') > -1 || key.toLowerCase().indexOf('auth') > -1) {
                const val = bodyData[key];
                if (val && String(val).length > 10) {
                    tokenVal = val;
                    console.log("✅ 在Body [" + key + "] 中发现Token");
                    break;
                }
            }
        }
    } catch (e) {
        if (DEBUG_MODE) console.log("⚠️ Body解析失败: " + e);
    }
}

// 保存Token
if (tokenVal) {
    const oldToken = $.getdata(GWM_TOKEN_KEY);
    if (oldToken !== tokenVal) {
        $.setdata(tokenVal, GWM_TOKEN_KEY);
        const displayToken = tokenVal.substring(0, 20) + '...';
        
        console.log("✅ Token 保存成功: " + displayToken);
        $.msg($.name, "🎉 Token抓取成功", "已保存: " + displayToken);
        $.setdata(new Date().toISOString(), GWM_TOKEN_KEY + "_time");
    } else {
        console.log("ℹ️ Token未变化，跳过保存");
    }
} else {
    console.log("❌ 未能从任何位置提取Token");
    console.log("💡 请确保:");
    console.log("   1. 已在MITM中添加: app-api.gwm.com.cn");
    console.log("   2. 已添加正确的rewrite规则");
    console.log("   3. 打开了长城App的'我的'页面或进行了登录");
    $.msg($.name, "⚠️ Token抓取失败", "请检查配置和操作步骤");
}
```

}

// ============ 签到逻辑 ============
async function signIn(token) {
const url = {
url: “https://” + GWM_HOST + API_URL.sign,
headers: {
‘Host’: GWM_HOST,
‘Content-Type’: ‘application/json;charset=utf-8’,
‘User-Agent’: ‘Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 GWMBrand/8.0.0’,
‘Authorization’: token,
‘token’: token,
‘Accept’: ‘application/json’
},
body: JSON.stringify({})
};

```
try {
    console.log("🚀 发送签到请求...");
    let result = await httpRequest(url, 'POST');
    
    if (DEBUG_MODE) {
        console.log("📦 服务端响应: " + JSON.stringify(result));
    }
    
    if (result) {
        if (result.code == 200 || result.code === 0 || result.success === true) {
            const reward = (result.data && result.data.reward) || (result.data && result.data.points) || result.message || "签到成功";
            $.msg($.name, "✅ 签到成功", "奖励: " + reward);
            console.log("✅ 签到成功: " + reward);
        } else if (result.code == 1001 || (result.message && result.message.indexOf("重复") > -1)) {
            $.msg($.name, "⚠️ 今日已签", result.message || "请勿重复签到");
            console.log("⚠️ 今日已签到");
        } else if (result.code == 401 || result.code == 403 || (result.message && result.message.indexOf("token") > -1)) {
            $.msg($.name, "❌ Token失效", "请重新打开APP获取");
            console.log("❌ Token失效，需要重新抓取");
        } else {
            $.msg($.name, "❌ 签到失败", result.message || "错误码:" + result.code);
            console.log("❌ 签到失败: " + result.message);
        }
    } else {
        $.msg($.name, "❌ 网络错误", "无响应数据");
        console.log("❌ 网络请求失败");
    }
} catch (err) {
    console.log("❌ 请求异常: " + err);
    $.msg($.name, "❌ 请求异常", String(err).substring(0, 50));
}
```

}

// ============ 环境检查 ============
async function checkEnv() {
if (gwm_token) {
if (gwm_token.indexOf(’@’) > -1) {
tokenArr = gwm_token.split(’@’);
for (let i = 0; i < tokenArr.length; i++) {
tokenArr[i] = tokenArr[i].trim();
}
} else {
tokenArr = [gwm_token.trim()];
}
console.log(“✅ 找到 “ + tokenArr.length + “ 个Token”);
return true;
} else {
const msg = “无法执行签到\n\n【获取Token步骤】\n1. 打开长城App\n2. 进入’我的’页面\n3. 等待脚本自动抓取\n\n如未出现通知，请检查:\n- MITM是否添加主机名\n- rewrite规则是否正确”;
$.msg($.name, “🚫 Token为空”, msg);
console.log(“❌ 变量为空，等待Token抓取…”);
return false;
}
}

// ============ HTTP 请求封装 ============
function httpRequest(options, method) {
if (!method) method = ‘GET’;

```
return new Promise(function(resolve) {
    let methodLower = method.toLowerCase();
    $[methodLower](options, function(err, resp, data) {
        try {
            if (err) {
                console.log("网络错误: " + err);
                resolve(null);
            } else {
                if (data) {
                    try { 
                        data = JSON.parse(data); 
                    } catch (e) {
                        console.log("JSON解析失败: " + e);
                    }
                }
                resolve(data);
            }
        } catch (e) { 
            console.log("处理异常: " + e);
            resolve(null); 
        }
    });
});
```

}

// ============ Env 工具类 ============
function Env(t, e) {
class s {
constructor(t) { this.env = t }
send(t, e) {
if (!e) e = “GET”;
t = “string” == typeof t ? { url: t } : t;
let s = this.get;
return “POST” === e && (s = this.post);
return new Promise((e, i) => { s.call(this, t, (t, s, r) => { t ? i(t) : e(s) }) });
}
get(t) { return this.send.call(this.env, t) }
post(t) { return this.send.call(this.env, t, “POST”) }
}
return new class {
constructor(t, e) {
this.name = t;
this.http = new s(this);
this.data = null;
this.dataFile = “box.dat”;
this.logs = [];
this.isMute = false;
this.isNeedRewrite = false;
this.logSeparator = “\n”;
this.encoding = “utf-8”;
this.startTime = (new Date).getTime();
if (e) Object.assign(this, e);
}
isNode() { return “undefined” != typeof module && !!module.exports }
isQuanX() { return “undefined” != typeof $task }
isSurge() { return “undefined” != typeof $httpClient && “undefined” == typeof $loon }
isLoon() { return “undefined” != typeof $loon }
getval(t) { return this.isSurge() || this.isLoon() ? $persistentStore.read(t) : this.isQuanX() ? $prefs.valueForKey(t) : this.isNode() ? (this.data = this.loaddata(), this.data[t]) : this.data && this.data[t] || null }
setval(t, e) { return this.isSurge() || this.isLoon() ? $persistentStore.write(t, e) : this.isQuanX() ? $prefs.setValueForKey(t, e) : this.isNode() ? (this.data = this.loaddata(), this.data[e] = t, this.writedata(), true) : this.data && this.data[e] || null }
getdata(t) { let e = this.getval(t); if (/^@/.test(t)) { const [, s, i] = /^@(.*?).(.*?)$/.exec(t), r = s ? this.getval(s) : “”; if (r) try { const t = JSON.parse(r); e = t ? this.lodash_get(t, i, “”) : e } catch (t) { e = “” } } return e }
setdata(t, e) { let s = false; if (/^@/.test(e)) { const [, i, r] = /^@(.*?).(.*?)$/.exec(e), o = this.getval(i), a = i ? “null” === o ? null : o || “{}” : “{}”; try { const e = JSON.parse(a); this.lodash_set(e, r, t); s = this.setval(JSON.stringify(e), i) } catch (e) { const o = {}; this.lodash_set(o, r, t); s = this.setval(JSON.stringify(o), i) } } else s = this.setval(t, e); return s }
lodash_get(t, e, s) { const i = e.replace(/[(\d+)]/g, “.$1”).split(”.”); let r = t; for (const t of i) if (r = Object(r)[t], void 0 === r) return s; return r }
lodash_set(t, e, s) { return Object(t) !== t ? t : (Array.isArray(e) || (e = e.toString().match(/[^.[]]+/g) || []), e.slice(0, -1).reduce((t, s, i) => Object(t[s]) === t[s] ? t[s] : t[s] = Math.abs(e[i + 1]) >> 0 == +e[i + 1] ? [] : {}, t)[e[e.length - 1]] = s, t) }
loaddata() { if (!this.isNode()) return {}; { this.fs = this.fs ? this.fs : require(“fs”), this.path = this.path ? this.path : require(“path”); const t = this.path.resolve(this.dataFile), e = this.path.resolve(process.cwd(), this.dataFile), s = this.fs.existsSync(t), i = !s && this.fs.existsSync(e); if (!s && !i) return {}; { const i = s ? t : e; try { return JSON.parse(this.fs.readFileSync(i)) } catch (t) { return {} } } } }
writedata() { if (this.isNode()) { this.fs = this.fs ? this.fs : require(“fs”), this.path = this.path ? this.path : require(“path”); const t = this.path.resolve(this.dataFile), e = this.path.resolve(process.cwd(), this.dataFile), s = this.fs.existsSync(t), i = !s && this.fs.existsSync(e), r = JSON.stringify(this.data); s ? this.fs.writeFileSync(t, r) : i ? this.fs.writeFileSync(e, r) : this.fs.writeFileSync(t, r) } }
msg(e, s, i, r) { const o = t => { if (!t) return t; if (“string” == typeof t) return this.isLoon() ? t : this.isQuanX() ? { “open-url”: t } : this.isSurge() ? { url: t } : void 0; if (“object” == typeof t) { if (this.isLoon()) { let e = t.openUrl || t.url || t[“open-url”], s = t.mediaUrl || t[“media-url”]; return { openUrl: e, mediaUrl: s } } if (this.isQuanX()) { let e = t[“open-url”] || t.url || t.openUrl, s = t[“media-url”] || t.mediaUrl; return { “open-url”: e, “media-url”: s } } if (this.isSurge()) { let e = t.url || t.openUrl || t[“open-url”]; return { url: e } } } }; if (this.isMute || (this.isSurge() || this.isLoon() ? $notification.post(e, s, i, o(r)) : this.isQuanX() && $notify(e, s, i, o(r))), !this.isMuteLog) { let t = [””, “==============📣系统通知📣==============”]; t.push(e); s && t.push(s); i && t.push(i); console.log(t.join(”\n”)); this.logs = this.logs.concat(t) } }
log(…t) { t.length > 0 && (this.logs = […this.logs, …t]), console.log(t.join(this.logSeparator)) }
wait(t) { return new Promise(e => setTimeout(e, t)) }
done(t) { const e = (new Date).getTime(), s = (e - this.startTime) / 1e3; this.log(””, “🔔” + this.name + “, 结束! 🕛 “ + s + “ 秒”), this.log(); if (this.isSurge() || this.isQuanX() || this.isLoon()) $done(t); else if (this.isNode()) process.exit(1); }
}(t, e)
}