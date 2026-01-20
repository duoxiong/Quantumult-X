/*
脚本名称：长城/坦克汽车自动签到 (增强Token抓取版)
脚本作者：GWM_User
更新时间：2026-01-20
优化方向：增强Token抓取机制、详细日志、多重匹配策略

================ Quantumult X 配置 ================

[MITM]
hostname = app-api.gwm.com.cn, gateway.gwm.com.cn

[rewrite_local]



^https://app-api.gwm.com.cn/app/v1/user/info url script-request-header https://raw.githubusercontent.com/duoxiong/Quantumult-X/refs/heads/main/rewrite/gwm_auto.js



^https://app-api.gwm.com.cn/app/v1/user/login url script-request-header https://raw.githubusercontent.com/duoxiong/Quantumult-X/refs/heads/main/rewrite/gwm_auto.js



^https://app-api.gwm.com.cn/app/v1/home url script-request-header https://raw.githubusercontent.com/duoxiong/Quantumult-X/refs/heads/main/rewrite/gwm_auto.js

[task_local]

# 每日 09:00 自动签到

0 9 * * * https://raw.githubusercontent.com/duoxiong/Quantumult-X/refs/heads/main/rewrite/gwm_auto.js, tag=长城汽车签到, enabled=true

*/

const $ = new Env(“长城汽车签到”);

// ============ 配置区域 ============
const GWM_TOKEN_KEY = ‘gwm_token’;
const GWM_HOST = ‘app-api.gwm.com.cn’;
const DEBUG_MODE = true; // 调试模式：打印详细日志

// 接口配置
const API_URL = {
sign: ‘/app/v1/activity/sign_in’,
};
// ===================================

let gwm_token = ($.isNode() ? process.env[GWM_TOKEN_KEY] : $.getdata(GWM_TOKEN_KEY)) || ‘’;
let tokenArr = [];

!(async () => {
// 【重点】检测是否为网络请求拦截
if (typeof $request !== ‘undefined’) {
console.log(“🔔 检测到长城汽车网络请求，正在提取 Token…”);
console.log(`📍 请求URL: ${$request.url}`);
await GetToken();
return;
}

```
// 定时任务逻辑
console.log(`\n🔔 ${$.name} 脚本启动...`);
if (!await checkEnv()) return;

for (let i = 0; i < tokenArr.length; i++) {
    let token = tokenArr[i];
    if (!token) continue;
    console.log(`\n👤 [账号 ${i + 1}] 开始执行...`);
    await signIn(token);
    await $.wait(2000); 
}
```

})()
.catch((e) => {
console.log(`❌ 致命错误: ${e}`);
$.msg($.name, “脚本运行异常”, String(e).substring(0, 100));
})
.finally(() => $.done());

// ============ Token 抓取逻辑 (增强版) ============
async function GetToken() {
if (!$request) {
console.log(“❌ 未检测到请求对象”);
return;
}

```
let tokenVal = '';
const headers = $request.headers || {};

if (DEBUG_MODE) {
    console.log("📋 当前Headers列表:");
    for (let [key, value] of Object.entries(headers)) {
        const displayVal = String(value).substring(0, 50);
        console.log(`   [${key}]: ${displayVal}...`);
    }
}

// 【策略1】检查常见Header字段（大小写不敏感）
const tokenPatterns = [
    /^authorization$/i,
    /^x-access-token$/i,
    /^x-auth-token$/i,
    /^token$/i,
    /^access-token$/i,
    /^x-token$/i,
    /^authorization-token$/i
];

for (let key in headers) {
    for (let pattern of tokenPatterns) {
        if (pattern.test(key)) {
            const val = headers[key];
            // 过滤掉过短或明显错误的值
            if (val && String(val).length > 10 && !val.includes('null')) {
                tokenVal = val;
                console.log(`✅ 在Header [${key}] 中发现Token`);
                break;
            }
        }
    }
    if (tokenVal) break;
}

// 【策略2】检查请求体 (有时token在Body中)
if (!tokenVal && $request.body) {
    try {
        let bodyData = {};
        if (typeof $request.body === 'string') {
            // 尝试JSON解析
            try {
                bodyData = JSON.parse($request.body);
            } catch {
                // 尝试URL编码解析
                const params = new URLSearchParams($request.body);
                params.forEach((val, key) => bodyData[key] = val);
            }
        } else {
            bodyData = $request.body;
        }

        if (DEBUG_MODE) {
            console.log(`📄 请求体数据: ${JSON.stringify(bodyData).substring(0, 100)}...`);
        }

        // 搜索Body中的token字段
        for (let key in bodyData) {
            if (/token|auth|access/i.test(key)) {
                const val = bodyData[key];
                if (val && String(val).length > 10) {
                    tokenVal = val;
                    console.log(`✅ 在Body [${key}] 中发现Token`);
                    break;
                }
            }
        }
    } catch (e) {
        if (DEBUG_MODE) console.log(`⚠️ Body解析失败: ${e}`);
    }
}

// 【保存Token】
if (tokenVal) {
    const oldToken = $.getdata(GWM_TOKEN_KEY);
    if (oldToken !== tokenVal) {
        $.setdata(tokenVal, GWM_TOKEN_KEY);
        const displayToken = tokenVal.substring(0, 20) + '...';
        
        console.log(`✅ Token 保存成功: ${displayToken}`);
        $.msg($.name, "🎉 Token抓取成功", `已保存: ${displayToken}`);
        
        // 保存Token时间戳（便于后续追踪）
        $.setdata(new Date().toISOString(), `${GWM_TOKEN_KEY}_time`);
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
url: `https://${GWM_HOST}${API_URL.sign}`,
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
    console.log(`🚀 发送签到请求...`);
    let result = await httpRequest(url, 'POST');
    
    if (DEBUG_MODE) {
        console.log(`📦 服务端响应: ${JSON.stringify(result)}`);
    }
    
    if (result) {
        if (result.code == 200 || result.code === 0 || result.success === true) {
            const reward = result.data?.reward || result.data?.points || result.message || "签到成功";
            $.msg($.name, "✅ 签到成功", `奖励: ${reward}`);
            console.log(`✅ 签到成功: ${reward}`);
        } else if (result.code == 1001 || (result.message && result.message.includes("重复"))) {
             $.msg($.name, "⚠️ 今日已签", result.message || "请勿重复签到");
             console.log(`⚠️ 今日已签到`);
        } else if (result.code == 401 || result.code == 403 || result.message?.includes("token")) {
            $.msg($.name, "❌ Token失效", "请重新打开APP获取");
            console.log(`❌ Token失效，需要重新抓取`);
        } else {
            $.msg($.name, "❌ 签到失败", result.message || `错误码:${result.code}`);
            console.log(`❌ 签到失败: ${result.message}`);
        }
    } else {
        $.msg($.name, "❌ 网络错误", "无响应数据");
        console.log(`❌ 网络请求失败`);
    }
} catch (err) {
    console.log(`❌ 请求异常: ${err}`);
    $.msg($.name, "❌ 请求异常", String(err).substring(0, 50));
}
```

}

// ============ 环境检查 ============
async function checkEnv() {
if (gwm_token) {
if (gwm_token.indexOf(’@’) > -1) {
tokenArr = gwm_token.split(’@’).filter(t => t.trim());
} else {
tokenArr = [gwm_token.trim()];
}
console.log(`✅ 找到 ${tokenArr.length} 个Token`);
return true;
} else {
const msg = “无法执行签到\n\n【获取Token步骤】\n1. 打开长城App\n2. 进入’我的’页面\n3. 等待脚本自动抓取\n\n如未出现通知，请检查:\n- MITM是否添加主机名\n- rewrite规则是否正确”;
$.msg($.name, “🚫 Token为空”, msg);
console.log(“❌ 变量为空，等待Token抓取…”);
return false;
}
}

// ============ HTTP 请求封装 ============
function httpRequest(options, method = ‘GET’) {
return new Promise((resolve) => {
$[method.toLowerCase()](options, (err, resp, data) => {
try {
if (err) {
console.log(`网络错误: ${err}`);
resolve(null);
} else {
if (data) {
try {
data = JSON.parse(data);
} catch (e) {
console.log(`JSON解析失败: ${e}`);
}
}
resolve(data);
}
} catch (e) {
console.log(`处理异常: ${e}`);
resolve(null);
}
});
});
}

// ============ Env 工具类 ============
function Env(t, e) {
class s {
constructor(t) { this.env = t }
send(t, e = “GET”) {
t = “string” == typeof t ? { url: t } : t;
let s = this.get;
return “POST” === e && (s = this.post), new Promise((e, i) => { s.call(this, t, (t, s, r) => { t ? i(t) : e(s) }) })
}
get(t) { return this.send.call(this.env, t) }
post(t) { return this.send.call(this.env, t, “POST”) }
}
return new class {
constructor(t, e) {
this.name = t, this.http = new s(this), this.data = null, this.dataFile = “box.dat”, this.logs = [], this.isMute = !1, this.isNeedRewrite = !1, this.logSeparator = “\n”, this.encoding = “utf-8”, this.startTime = (new Date).getTime(), Object.assign(this, e), this.log(””, `🔔${this.name}, 开始!`)
}
isNode() { return “undefined” != typeof module && !!module.exports }
isQuanX() { return “undefined” != typeof $task }
isSurge() { return “undefined” != typeof $httpClient && “undefined” == typeof $loon }
isLoon() { return “undefined” != typeof $loon }
toObj(t, e = null) { try { return JSON.parse(t) } catch { return e } }
toStr(t, e = null) { try { return JSON.stringify(t) } catch { return e } }
getjson(t, e) { let s = e; const i = this.getdata(t); if (i) try { s = JSON.parse(this.getdata(t)) } catch { } return s }
setjson(t, e) { try { return this.setdata(JSON.stringify(t), e) } catch { return !1 } }
getScript(t) { return new Promise(e => { this.get({ url: t }, (t, s, i) => e(i)) }) }
runScript(t, e) { return new Promise(s => { let i = this.getdata(”@chavy_boxjs_userCfgs.httpapi”); i = i ? i.replace(/\n/g, “”).trim() : i; let r = this.getdata(”@chavy_boxjs_userCfgs.httpapi_timeout”); r = r ? 1 * r : 20, r = e && e.timeout ? e.timeout : r; const [o, a] = i.split(”@”), n = { url: `http://${a}/v1/scripting/evaluate`, body: { script_text: t, mock_type: “cron”, timeout: r }, headers: { “X-Key”: o, Accept: “*/*” } }; this.post(n, (t, e, i) => s(i)) }).catch(t => this.logErr(t)) }
loaddata() { if (!this.isNode()) return {}; { this.fs = this.fs ? this.fs : require(“fs”), this.path = this.path ? this.path : require(“path”); const t = this.path.resolve(this.dataFile), e = this.path.resolve(process.cwd(), this.dataFile), s = this.fs.existsSync(t), i = !s && this.fs.existsSync(e); if (!s && !i) return {}; { const i = s ? t : e; try { return JSON.parse(this.fs.readFileSync(i)) } catch (t) { return {} } } } }
writedata() { if (this.isNode()) { this.fs = this.fs ? this.fs : require(“fs”), this.path = this.path ? this.path : require(“path”); const t = this.path.resolve(this.dataFile), e = this.path.resolve(process.cwd(), this.dataFile), s = this.fs.existsSync(t), i = !s && this.fs.existsSync(e), r = JSON.stringify(this.data); s ? this.fs.writeFileSync(t, r) : i ? this.fs.writeFileSync(e, r) : this.fs.writeFileSync(t, r) } }
lodash_get(t, e, s) { const i = e.replace(/[(\d+)]/g, “.$1”).split(”.”); let r = t; for (const t of i) if (r = Object(r)[t], void 0 === r) return s; return r }
lodash_set(t, e, s) { return Object(t) !== t ? t : (Array.isArray(e) || (e = e.toString().match(/[^.[]]+/g) || []), e.slice(0, -1).reduce((t, s, i) => Object(t[s]) === t[s] ? t[s] : t[s] = Math.abs(e[i + 1]) >> 0 == +e[i + 1] ? [] : {}, t)[e[e.length - 1]] = s, t) }
getdata(t) { let e = this.getval(t); if (/^@/.test(t)) { const [, s, i] = /^@(.*?).(.*?)$/.exec(t), r = s ? this.getval(s) : “”; if (r) try { const t = JSON.parse(r); e = t ? this.lodash_get(t, i, “”) : e } catch (t) { e = “” } } return e }
setdata(t, e) { let s = !1; if (/^@/.test(e)) { const [, i, r] = /^@(.*?).(.*?)$/.exec(e), o = this.getval(i), a = i ? “null” === o ? null : o || “{}” : “{}”; try { const e = JSON.parse(a); this.lodash_set(e, r, t), s = this.setval(JSON.stringify(e), i) } catch (e) { const o = {}; this.lodash_set(o, r, t), s = this.setval(JSON.stringify(o), i) } } else s = this.setval(t, e); return s }
getval(t) { return this.isSurge() || this.isLoon() ? $persistentStore.read(t) : this.isQuanX() ? $prefs.valueForKey(t) : this.isNode() ? (this.data = this.loaddata(), this.data[t]) : this.data && this.data[t] || null }
setval(t, e) { return this.isSurge() || this.isLoon() ? $persistentStore.write(t, e) : this.isQuanX() ? $prefs.setValueForKey(t, e) : this.isNode() ? (this.data = this.loaddata(), this.data[e] = t, this.writedata(), !0) : this.data && this.data[e] || null }
initGotEnv(t) { this.got = this.got ? this.got : require(“got”), this.cktough = this.cktough ? this.cktough : require(“tough-cookie”), this.ckjar = this.ckjar ? this.ckjar : new this.cktough.CookieJar, t && (t.headers = t.headers ? t.headers : {}, void 0 === t.headers.Cookie && void 0 === t.cookieJar && (t.cookieJar = this.ckjar)) }
get(t, e = (() => { })) { if (t.headers && (delete t.headers[“Content-Type”], delete t.headers[“Content-Length”]), this.isSurge() || this.isLoon()) this.isSurge() && this.isNeedRewrite && (t.headers = t.headers || {}, Object.assign(t.headers, { “X-Surge-Skip-Scripting”: !1 })), $httpClient.get(t, (t, s, i) => { !t && s && (s.body = i, s.statusCode = s.status ? s.status : s.statusCode, s.status = s.statusCode), e(t, s, i) }); else if (this.isQuanX()) this.isNeedRewrite && (t.opts = t.opts || {}, Object.assign(t.opts, { hints: !1 })), $task.fetch(t).then(t => { const { statusCode: s, statusCode: i, headers: r, body: o } = t; e(null, { status: s, statusCode: i, headers: r, body: o }, o) }, t => e(t && t.error || “UndefinedError”)); else if (this.isNode()) { let s = require(“iconv-lite”); this.initGotEnv(t), this.got(t).on(“redirect”, (t, e) => { try { if (t.headers[“set-cookie”]) { const s = t.headers[“set-cookie”].map(this.cktough.Cookie.parse).toString(); s && this.ckjar.setCookieSync(s, null), e.cookieJar = this.ckjar } } catch (t) { this.logErr(t) } }).then(t => { const { statusCode: i, statusCode: r, headers: o, rawBody: a } = t, n = s.decode(a, this.encoding); e(null, { status: i, statusCode: r, headers: o, rawBody: a, body: n }, n) }, t => { const { message: i, response: r } = t; e(i, r, r && s.decode(r.rawBody, this.encoding)) }) } }
post(t, e = (() => { })) { const s = t.method ? t.method.toLocaleLowerCase() : “post”; if (t.body && t.headers && !t.headers[“Content-Type”] && (t.headers[“Content-Type”] = “application/x-www-form-urlencoded”), t.headers && delete t.headers[“Content-Length”], this.isSurge() || this.isLoon()) this.isSurge() && this.isNeedRewrite && (t.headers = t.headers || {}, Object.assign(t.headers, { “X-Surge-Skip-Scripting”: !1 })), $httpClient[s](t, (t, s, i) => { !t && s && (s.body = i, s.statusCode = s.status ? s.status : s.statusCode, s.status = s.statusCode), e(t, s, i) }); else if (this.isQuanX()) t.method = s, this.isNeedRewrite && (t.opts = t.opts || {}, Object.assign(t.opts, { hints: !1 })), $task.fetch(t).then(t => { const { statusCode: s, statusCode: i, headers: r, body: o } = t; e(null, { status: s, statusCode: i, headers: r, body: o }, o) }, t => e(t && t.error || “UndefinedError”)); else if (this.isNode()) { let i = require(“iconv-lite”); this.initGotEnv(t); const { url: r, …o } = t; this.got[s](r, o).then(t => { const { statusCode: s, statusCode: r, headers: o, rawBody: a } = t, n = i.decode(a, this.encoding); e(null, { status: s, statusCode: r, headers: o, rawBody: a, body: n }, n) }, t => { const { message: s, response: r } = t; e(s, r, r && i.decode(r.rawBody, this.encoding)) }) } }
time(t, e = null) { const s = e ? new Date(e) : new Date; let i = { “M+”: s.getMonth() + 1, “d+”: s.getDate(), “H+”: s.getHours(), “m+”: s.getMinutes(), “s+”: s.getSeconds(), “q+”: Math.floor((s.getMonth() + 3) / 3), S: s.getMilliseconds() }; /(y+)/.test(t) && (t = t.replace(RegExp.$1, (s.getFullYear() + “”).substr(4 - RegExp.$1.length))); for (let e in i) new RegExp(”(” + e + “)”).test(t) && (t = t.replace(RegExp.$1, 1 == RegExp.$1.length ? i[e] : (“00” + i[e]).substr((”” + i[e]).length))); return t }
msg(e = t, s = “”, i = “”, r) { const o = t => { if (!t) return t; if (“string” == typeof t) return this.isLoon() ? t : this.isQuanX() ? { “open-url”: t } : this.isSurge() ? { url: t } : void 0; if (“object” == typeof t) { if (this.isLoon()) { let e = t.openUrl || t.url || t[“open-url”], s = t.mediaUrl || t[“media-url”]; return { openUrl: e, mediaUrl: s } } if (this.isQuanX()) { let e = t[“open-url”] || t.url || t.openUrl, s = t[“media-url”] || t.mediaUrl, i = t[“update-pasteboard”] || t.updatePasteboard; return { “open-url”: e, “media-url”: s, “update-pasteboard”: i } } if (this.isSurge()) { let e = t.url || t.openUrl || t[“open-url”]; return { url: e } } } }; if (this.isMute || (this.isSurge() || this.isLoon() ? $notification.post(e, s, i, o(r)) : this.isQuanX() && $notify(e, s, i, o(r))), !this.isMuteLog) { let t = [””, “==============📣系统通知📣==============”]; t.push(e), s && t.push(s), i && t.push(i), console.log(t.join(”\n”)), this.logs = this.logs.concat(t) } }
log(…t) { t.length > 0 && (this.logs = […this.logs, …t]), console.log(t.join(this.logSeparator)) }
logErr(t, e) { const s = !this.isSurge() && !this.isQuanX() && !this.isLoon(); s ? this.log(””, `❗️${this.name}, 错误!`, t.stack) : this.log(””, `❗️${this.name}, 错误!`, t) }
wait(t) { return new Promise(e => setTimeout(e, t)) }
done(t = {}) { const e = (new Date).getTime(), s = (e - this.startTime) / 1e3; this.log(””, `🔔${this.name}, 结束! 🕛 ${s} 秒`), this.log(), this.isSurge() || this.isQuanX() || this.isLoon() ? $done(t) : this.isNode() && process.exit(1) }
}(t, e)
}