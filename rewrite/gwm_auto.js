/*
脚本名称：长城汽车自动签到
活动入口：长城/坦克汽车APP-我的-签到
签到规则：连签奖励，积分递增
环境变量：gwm_token（多账号以@隔开）
使用说明：添加重写规则，打开长城汽车APP即可自动获取Token

================ Surge 配置 ================
[MITM]
hostname = %APPEND% app-api.gwm.com.cn

[Script]
获取长城汽车Token = type=http-response, pattern=^https://app-api.gwm.com.cn/app/v1/user/info, requires-body=1, max-size=0, script-path=https://raw.githubusercontent.com/duoxiong/Quantumult-X/refs/heads/main/rewrite/gwm_auto.js

长城汽车签到 = type=cron, cronexp=15 9 * * *, timeout=60, script-path=https://raw.githubusercontent.com/duoxiong/Quantumult-X/refs/heads/main/rewrite/gwm_auto.js, script-update-interval=0

============ Quantumult X 配置 =============
[MITM]
hostname = app-api.gwm.com.cn

[rewrite_local]
^https://app-api.gwm.com.cn/app/v1/user/info url script-response-body https://raw.githubusercontent.com/duoxiong/Quantumult-X/refs/heads/main/rewrite/gwm_auto.js

[task_local]
15 9 * * * https://raw.githubusercontent.com/duoxiong/Quantumult-X/refs/heads/main/rewrite/gwm_auto.js, tag=长城汽车签到, enabled=true

============ Loon 配置 ================
[MITM]
hostname = app-api.gwm.com.cn

cron “15 9 * * *” script-path=https://raw.githubusercontent.com/duoxiong/Quantumult-X/refs/heads/main/rewrite/gwm_auto.js, tag=长城汽车签到

http-response ^https://app-api.gwm.com.cn/app/v1/user/info script-path=https://raw.githubusercontent.com/duoxiong/Quantumult-X/refs/heads/main/rewrite/gwm_auto.js, requires-body=true, timeout=10

*/

// ==================== 配置区域 ====================
const $ = new Env(‘长城汽车签到’);
const origin = ‘https://app-api.gwm.com.cn’;
const GWM_TOKEN_KEY = ‘gwm_token’;
const GWM_USER_KEY = ‘gwm_user_info’;
const Notify = 1;  // 0 关闭通知，1 打开通知
$.messages = [];

// ==================== 变量初始化 ====================
$.is_debug = ($.isNode() ? process.env.IS_DEBUG : $.getdata(‘is_debug’)) || ‘false’;
let token = ($.isNode() ? process.env.gwm_token : $.getdata(GWM_TOKEN_KEY)) || ‘’;
let tokenArr = [];

// API 接口配置
const Api = {
“signIn”: {
“url”: “/app/v1/activity/sign_in”,
“method”: “POST”
},
“userInfo”: {
“url”: “/app/v1/user/info”,
“method”: “GET”
},
“signStatus”: {
“url”: “/app/v1/activity/sign_status”,
“method”: “GET”
}
}

// ==================== 主程序入口 ====================
!(async () => {
try {
// 检查是否为请求拦截（获取Token）
if (typeof $request !== ‘undefined’) {
console.log(‘🔔 [检测] 捕获到网络请求，开始提取Token…’);
await GetToken();
return;
}

```
console.log(`\n========== ${$.name} 开始执行 ==========\n`);

// 检查环境变量
await checkEnv();

// 未检测到Token，退出
if (!tokenArr[0]) {
  throw new Error('❌ 未获取到Token\n\n【获取步骤】\n1. 打开长城/坦克汽车APP\n2. 进入"我的"页面\n3. 等待脚本自动抓取Token\n\n如仍未出现，请检查:\n- MITM主机名是否正确\n- rewrite规则是否启用');
}

// 执行签到任务
await main();
```

} catch (e) {
$.messages.push(e.message || String(e));
console.log(`\n❌ 错误: ${e}`);
} finally {
await sendMsg($.messages.join(’\n’));
$.done();
}
})();

// ==================== 获取并保存Token ====================
async function GetToken() {
try {
let tokenVal = ‘’;
let userInfo = {};

```
// 【方案1】从请求头中提取Token
if ($request && $request.headers) {
  const headers = $request.headers;
  const authKeys = ['Authorization', 'authorization', 'token', 'Token', 'x-token', 'X-Token'];
  
  for (let key of authKeys) {
    if (headers[key]) {
      tokenVal = headers[key];
      console.log(`✅ [Header] 在 "${key}" 中发现Token`);
      break;
    }
  }
}

// 【方案2】从响应体中提取Token和用户信息
if ($response && $response.body) {
  try {
    let body = JSON.parse($response.body);
    
    // 提取用户信息
    if (body.data && body.data.userId) {
      userInfo = {
        userId: body.data.userId,
        mobile: body.data.mobile || body.data.phone || '',
        userName: body.data.userName || body.data.name || ''
      };
    }

    // 从响应体提取Token
    if (body.data && body.data.token && !tokenVal) {
      tokenVal = body.data.token;
      console.log(`✅ [Body] 在响应体中发现Token`);
    }
  } catch (e) {
    console.log(`⚠️ 响应体解析失败: ${e}`);
  }
}

// 【保存Token】
if (tokenVal && tokenVal.length > 20) {
  let oldToken = $.getdata(GWM_TOKEN_KEY);
  
  if (oldToken !== tokenVal) {
    $.setdata(tokenVal, GWM_TOKEN_KEY);
    
    // 保存用户信息
    if (Object.keys(userInfo).length > 0) {
      $.setdata(JSON.stringify(userInfo), GWM_USER_KEY);
      console.log(`✅ 用户信息已保存`);
    }

    console.log(`✅ Token已保存: ${tokenVal.substring(0, 20)}...`);
    $.msg('长城汽车签到', '🎉 Token获取成功', `已保存用于签到`);
  } else {
    console.log(`ℹ️ Token未变化，跳过保存`);
  }
} else {
  console.log(`⚠️ 未能提取有效Token`);
}
```

} catch (e) {
console.log(`❌ GetToken异常: ${e}`);
}
}

// ==================== 主执行函数 ====================
async function main() {
for (let i = 0; i < tokenArr.length; i++) {
console.log(`\n➤ 【账号 ${i + 1}/${tokenArr.length}】开始执行\n`);

```
// 变量初始化
$.message = '';
$.result = '';
$.userInfo = {};
$.currentToken = tokenArr[i];

// 获取用户信息
await getUserInfo();

// 执行签到
await signIn();

// 拼接通知消息
if ($.result) {
  $.messages.push(`${$.result.replace(/\n$/, '')}`);
}

// 账号间隔3秒
await $.wait(3000);
```

}
}

// ==================== 签到函数 ====================
async function signIn() {
try {
let result = await httpRequest(
options(Api.signIn.url, JSON.stringify({}), Api.signIn.method)
);

```
debug(result, "signIn");

if (!result) {
  $.result += `❌ 网络请求失败\n`;
  return;
}

if (result.code === 200 || result.success === true) {
  $.result += `✅ 签到成功\n`;
  
  if (result.data) {
    const points = result.data.points || result.data.reward || result.data.integralValue || 0;
    const message = result.data.message || result.message || '';
    
    $.result += `获得积分: ${points} 分\n`;
    if (message) $.result += `${message}\n`;
  }
} else if (result.code === 1001 || (result.message && result.message.includes('重复'))) {
  $.result += `⚠️ 今日已签到\n`;
  if (result.message) $.result += `${result.message}\n`;
} else if (result.code === 401 || result.code === 403) {
  $.result += `❌ Token失效\n`;
  $.result += `请重新打开APP获取Token\n`;
} else {
  $.result += `❌ 签到失败\n`;
  $.result += `错误: ${result.message || result.code || '未知错误'}\n`;
}
```

} catch (e) {
$.result += `❌ 签到异常: ${e}\n`;
}
}

// ==================== 获取用户信息 ====================
async function getUserInfo() {
try {
let result = await httpRequest(
options(Api.userInfo.url, ‘’, Api.userInfo.method)
);

```
debug(result, "getUserInfo");

if (!result) {
  console.log(`⚠️ 用户信息查询失败（网络错误）`);
  return;
}

if (result.code === 200 && result.data) {
  $.userInfo = {
    mobile: result.data.mobile || result.data.phone || '未知',
    userName: result.data.userName || result.data.name || '',
    integralBalance: result.data.integralBalance || result.data.points || 0
  };

  console.log(`✅ 账号: ${hideSensitiveData($.userInfo.mobile, 3, 4)}`);
  console.log(`✅ 积分余额: ${$.userInfo.integralBalance}`);

  $.result += `账号: ${hideSensitiveData($.userInfo.mobile, 3, 4)}\n`;
  $.result += `积分余额: ${$.userInfo.integralBalance}\n`;
} else {
  console.log(`⚠️ 用户信息查询失败: ${result.message || result.code}`);
}
```

} catch (e) {
console.log(`⚠️ getUserInfo异常: ${e}`);
}
}

// ==================== 检查环境变量 ====================
async function checkEnv() {
tokenArr = token.split(’@’).filter(t => t && t.trim().length > 20);

if (tokenArr.length > 0) {
console.log(`✅ 检测到 ${tokenArr.length} 个账号`);
return tokenArr.length;
} else {
console.log(`⚠️ 检测到 0 个有效账号`);
return 0;
}
}

// ==================== 发送通知 ====================
async function sendMsg(message) {
if (!message) return;
message = message.replace(/\n+$/, ‘’);

if (Notify > 0) {
if ($.isNode()) {
try {
var notify = require(’./sendNotify’);
} catch (e) {
try {
var notify = require(’./utils/sendNotify’);
} catch (e2) {
console.log(`⚠️ 通知模块加载失败，使用控制台输出`);
console.log(message);
return;
}
}
await notify.sendNotify($.name, message);
} else {
$.msg($.name, ‘’, message);
}
} else {
console.log(`\n📱 签到结果:\n${message}`);
}
}

// ==================== 请求参数封装 ====================
function options(url, body = ‘’, method = ‘GET’) {
let opt = {
url: `${origin}${url}`,
headers: {
“Host”: “app-api.gwm.com.cn”,
“Content-Type”: “application/json;charset=utf-8”,
“Accept-Encoding”: “gzip, deflate, br”,
“Connection”: “keep-alive”,
“Accept”: “*/*”,
“User-Agent”: “Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 GWMBrand/8.0.0”,
“Accept-Language”: “zh-Hans-CN;q=1”,
“Authorization”: $.currentToken || token
},
timeout: 15000
};

if (body) {
opt.body = body;
opt.method = method.toUpperCase();
}

debug(opt, “request”);
return opt;
}

// ==================== 调试函数 ====================
function debug(content, title = “debug”) {
if ($.is_debug !== ‘true’) return;

let start = `\n----- ${title} @ ${$.time('HH:mm:ss')} -----`;
let end = `----- end -----\n`;

if (typeof content === “string”) {
console.log(start + ‘\n’ + content + ‘\n’ + end);
} else if (typeof content === “object”) {
console.log(start + ‘\n’ + JSON.stringify(content, null, 2) + ‘\n’ + end);
}
}

// ==================== 数据脱敏 ====================
function hideSensitiveData(string, head_length = 2, foot_length = 2) {
if (!string || string.length < head_length + foot_length) {
return string || ‘***’;
}

let star = ‘’;
for (let i = 0; i < string.length - head_length - foot_length; i++) {
star += ‘*’;
}

return string.substring(0, head_length) + star + string.substring(string.length - foot_length);
}

// ==================== HTTP请求函数 ====================
function httpRequest(options, method = ‘GET’) {
if (‘body’ in options) {
method = ‘POST’;
}

return new Promise((resolve) => {
$[method.toLowerCase()](options, (err, resp, data) => {
try {
if (err) {
console.log(`❌ 请求失败: ${options.url}`);
console.log(`   错误: ${err}`);
resolve(null);
return;
}

```
    if (!data) {
      console.log(`⚠️ 服务器返回空数据`);
      resolve(null);
      return;
    }

    // 尝试JSON解析
    try {
      let parsed = JSON.parse(data);
      if (typeof parsed === 'object') {
        resolve(parsed);
        return;
      }
    } catch (e) {
      console.log(`⚠️ JSON解析失败`);
    }

    resolve(data);
  } catch (e) {
    console.log(`❌ 请求处理异常: ${e}`);
    resolve(null);
  }
});
```

});
}

// ==================== Env工具类 ====================
function Env(t, e) {
class s {
constructor(t) {
this.env = t;
}

```
send(t, e = "GET") {
  t = "string" == typeof t ? { url: t } : t;
  let s = this.get;
  return "POST" === e && (s = this.post), new Promise((e, i) => {
    s.call(this, t, (t, s, r) => {
      t ? i(t) : e(s);
    });
  });
}

get(t) {
  return this.send.call(this.env, t);
}

post(t) {
  return this.send.call(this.env, t, "POST");
}
```

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
this.startTime = new Date().getTime();
Object.assign(this, e);
}

```
isNode() {
  return typeof module !== "undefined" && !!module.exports;
}

isQuanX() {
  return typeof $task !== "undefined";
}

isSurge() {
  return typeof $httpClient !== "undefined" && typeof $loon === "undefined";
}

isLoon() {
  return typeof $loon !== "undefined";
}

toObj(t, e = null) {
  try {
    return JSON.parse(t);
  } catch {
    return e;
  }
}

toStr(t, e = null) {
  try {
    return JSON.stringify(t);
  } catch {
    return e;
  }
}

getdata(t) {
  let e = this.getval(t);
  if (/^@/.test(t)) {
    const regex = /^@(.*?)\.(.*?)$/;
    const match = regex.exec(t);
    if (match) {
      const [, s, i] = match;
      const r = s ? this.getval(s) : "";
      if (r) {
        try {
          const obj = JSON.parse(r);
          e = obj ? this.lodash_get(obj, i, "") : e;
        } catch (t) {
          e = "";
        }
      }
    }
  }
  return e;
}

setdata(t, e) {
  let s = false;
  if (/^@/.test(e)) {
    const regex = /^@(.*?)\.(.*?)$/;
    const match = regex.exec(e);
    if (match) {
      const [, i, r] = match;
      const o = this.getval(i);
      const a = i ? (o === "null" ? null : o || "{}") : "{}";
      try {
        const obj = JSON.parse(a);
        this.lodash_set(obj, r, t);
        s = this.setval(JSON.stringify(obj), i);
      } catch (e) {
        const o = {};
        this.lodash_set(o, r, t);
        s = this.setval(JSON.stringify(o), i);
      }
    }
  } else {
    s = this.setval(t, e);
  }
  return s;
}

lodash_get(t, e, s) {
  const i = e.replace(/\[(\d+)\]/g, ".$1").split(".");
  let r = t;
  for (const t of i) {
    if ((r = Object(r)[t]), void 0 === r) return s;
  }
  return r;
}

lodash_set(t, e, s) {
  return Object(t) !== t
    ? t
    : (Array.isArray(e) || (e = e.toString().match(/[^.[\]]+/g) || []),
      e.slice(0, -1).reduce(
        (t, s, i) =>
          Object(t[s]) === t[s]
            ? t[s]
            : (t[s] = Math.abs(e[i + 1]) >> 0 == e[i + 1] ? [] : {}),
        t
      ),
      (t[e[e.length - 1]] = s),
      t);
}

getval(t) {
  return this.isSurge() || this.isLoon()
    ? $persistentStore.read(t)
    : this.isQuanX()
    ? $prefs.valueForKey(t)
    : this.isNode()
    ? (this.data = this.loaddata(), this.data[t])
    : this.data && this.data[t];
}

setval(t, e) {
  return this.isSurge() || this.isLoon()
    ? $persistentStore.write(t, e)
    : this.isQuanX()
    ? $prefs.setValueForKey(t, e)
    : this.isNode()
    ? (this.data = this.loaddata(), (this.data[e] = t), this.writedata(), true)
    : this.data && (this.data[e] = t);
}

loaddata() {
  if (!this.isNode()) return {};
  this.fs = this.fs ? this.fs : require("fs");
  this.path = this.path ? this.path : require("path");
  const t = this.path.resolve(this.dataFile);
  const e = this.path.resolve(process.cwd(), this.dataFile);
  const s = this.fs.existsSync(t);
  const i = !s && this.fs.existsSync(e);
  if (!s && !i) return {};
  const filename = s ? t : e;
  try {
    return JSON.parse(this.fs.readFileSync(filename));
  } catch (t) {
    return {};
  }
}

writedata() {
  if (this.isNode()) {
    this.fs = this.fs ? this.fs : require("fs");
    this.path = this.path ? this.path : require("path");
    const t = this.path.resolve(this.dataFile);
    const e = this.path.resolve(process.cwd(), this.dataFile);
    const s = this.fs.existsSync(t);
    const i = !s && this.fs.existsSync(e);
    const r = JSON.stringify(this.data);
    s ? this.fs.writeFileSync(t, r) : i ? this.fs.writeFileSync(e, r) : this.fs.writeFileSync(t, r);
  }
}

time(t, e = null) {
  const s = e ? new Date(e) : new Date();
  let i = {
    "M+": s.getMonth() + 1,
    "d+": s.getDate(),
    "H+": s.getHours(),
    "m+": s.getMinutes(),
    "s+": s.getSeconds(),
    "q+": Math.floor((s.getMonth() + 3) / 3),
    S: s.getMilliseconds()
  };
  if (/(y+)/.test(t)) {
    t = t.replace(RegExp.$1, (s.getFullYear() + "").substr(4 - RegExp.$1.length));
  }
  for (let e in i) {
    new RegExp("(" + e + ")").test(t) &&
      (t = t.replace(
        RegExp.$1,
        1 == RegExp.$1.length ? i[e] : ("00" + i[e]).substr(("" + i[e]).length)
      ));
  }
  return t;
}

msg(e = t, s = "", i = "", r) {
  const o = (t) => {
    if (!t) return t;
    if ("string" == typeof t)
      return this.isLoon()
        ? t
        : this.isQuanX()
        ? { "open-url": t }
        : this.isSurge()
        ? { url: t }
        : void 0;
    if ("object" == typeof t) {
      if (this.isLoon()) {
        let e = t.openUrl || t.url || t["open-url"];
        let s = t.mediaUrl || t["media-url"];
        return { openUrl: e, mediaUrl: s };
      }
      if (this.isQuanX()) {
        let e = t["open-url"] || t.url || t.openUrl;
        let s = t["media-url"] || t.mediaUrl;
        let i = t["update-pasteboard"] || t.updatePasteboard;
        return { "open-url": e, "media-url": s, "update-pasteboard": i };
      }
      if (this.isSurge()) {
        let e = t.url || t.openUrl || t["open-url"];
        return { url: e };
      }
    }
  };
  if (
    this.isMute ||
    (this.isSurge() || this.isLoon()
      ? $notification.post(e, s, i, o(r))
      : this.isQuanX() && $notify(e, s, i, o(r)))
  ) {
    let t = ["", "==============📣系统通知📣=============="];
    t.push(e);
    s && t.push(s);
    i && t.push(i);
    console.log(t.join("\n"));
    this.logs = this.logs.concat(t);
  }
}

log(...t) {
  t.length > 0 && (this.logs = [...this.logs, ...t]);
  console.log(t.join(this.logSeparator));
}

logErr(t, e) {
  const s = !this.isSurge() && !this.isQuanX() && !this.isLoon();
  s ? this.log("", `❗️${this.name}, 错误!`, t.stack) : this.log("", `❗️${this.name}, 错误!`, t);
}

wait(t) {
  return new Promise((e) => setTimeout(e, t));
}

done(t = {}) {
  const e = new Date().getTime();
  const s = (e - this.startTime) / 1000;
  this.log("", `🔔${this.name}, 结束! 🕛 ${s} 秒`);
  this.log();
  if (this.isSurge() || this.isQuanX() || this.isLoon()) {
    $done(t);
  } else if (this.isNode()) {
    process.exit(1);
  }
}
```

}(t, e);
}