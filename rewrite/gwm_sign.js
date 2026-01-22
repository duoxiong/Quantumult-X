/*
长城/哈弗汽车自动签到
项目名称: GWM Auto Sign (Dynamic)
脚本作者: Gemini & Duoxiong
更新时间: 2026-01-22
使用说明: 
1. 首次使用或提示 401 错误时：请打开 App -> 签到页面 -> 点击“签到”按钮 (必须点按钮，为了抓取签名)。
2. 等待 Quantumult X 弹窗“🎉 核心签名已捕获”。
3. 每日 9:00 自动执行。

[rewrite_local]
# 核心抓取：同时监听“用户中心”(用于保活Token) 和 “签到接口”(用于抓取签名)
^https:\/\/(gapp-api|gwm-api)\.gwmapp-h\.com\/(api-u\/v1\/app\/uc\/.*|community-u\/v1\/user\/sign\/sureNew) url script-request-body https://raw.githubusercontent.com/duoxiong/Quantumult-X/refs/heads/main/rewrite/gwm_sign.js

[task_local]
# 每日 9:00 执行签到
0 9 * * * https://raw.githubusercontent.com/duoxiong/Quantumult-X/refs/heads/main/rewrite/gwm_sign.js, tag=长城汽车签到, img-url=https://raw.githubusercontent.com/Orz-3/mini/master/Color/GWM.png, enabled=true

[mitm]
hostname = gapp-api.gwmapp-h.com, gwm-api.gwmapp-h.com
*/

const $ = new Env("长城汽车签到");

// -------------------------------------------------------
// 1. 数据存储 Key
// -------------------------------------------------------
const KEY_AUTH = "duoxiong_gwm_auth";       // 身份 Authorization
const KEY_GTOKEN = "duoxiong_gwm_gtoken";   // 身份 G-Token
const KEY_SIGN = "duoxiong_gwm_sign";       // 动态签名 Sign
const KEY_TIME = "duoxiong_gwm_timestamp";  // 动态时间戳 TimeStamp
const KEY_BODY = "duoxiong_gwm_body";       // 包含 userId 的 Body

// 签到接口地址
const SIGN_URL = "https://gwm-api.gwmapp-h.com/community-u/v1/user/sign/sureNew";

// -------------------------------------------------------
// 2. 逻辑入口
// -------------------------------------------------------

const isGetCookie = typeof $request !== "undefined";

if (isGetCookie) {
  GetCookie();
  $.done();
} else {
  SignIn();
}

// -------------------------------------------------------
// 3. 抓取逻辑 (GetCookie)
// -------------------------------------------------------
function GetCookie() {
  const url = $request.url;
  const headers = $request.headers;
  const body = $request.body;
  
  // 标记是否更新了数据
  let capturedType = null;

  // 1. 抓取通用鉴权信息 (Auth & Token)
  // 这两个在“我的”页面或者“签到”页面都能抓到
  let newAuth = null;
  let newToken = null;
  let newSign = null;
  let newTime = null;

  for (let key in headers) {
    const k = key.toLowerCase();
    if (k === "authorization") newAuth = headers[key];
    if (k === "g-token") newToken = headers[key];
    if (k === "sign") newSign = headers[key];
    if (k === "timestamp") newTime = headers[key];
  }

  // 保存通用 Token (保活)
  if (newAuth) $.setdata(newAuth, KEY_AUTH);
  if (newToken) $.setdata(newToken, KEY_GTOKEN);

  // 2. [核心] 抓取签到专用的签名
  // 只有当 URL 是签到接口时，才保存 Sign 和 Timestamp
  if (url.indexOf("user/sign/sureNew") > -1) {
    if (newSign && newTime) {
      $.setdata(newSign, KEY_SIGN);
      $.setdata(newTime, KEY_TIME);
      if (body) $.setdata(body, KEY_BODY);
      
      capturedType = "SIGN";
      console.log(`[核心抓取] 捕获到签名: ${newSign}`);
    }
  } else if (newAuth || newToken) {
    // 只是在浏览 App，更新一下 Token
    capturedType = "TOKEN";
  }

  // 3. 提示逻辑
  if (capturedType === "SIGN") {
    // 只有抓到了签名才弹窗，因为这是解决问题的关键
    $.msg($.name, "🎉 核心签名已捕获", "脚本已获取最新签名，下次将使用此签名尝试签到！");
  } else if (capturedType === "TOKEN") {
    console.log(`[自动续期] 已更新 Auth/Token 来自: ${url}`);
  }
}

// -------------------------------------------------------
// 4. 签到逻辑 (SignIn)
// -------------------------------------------------------
async function SignIn() {
  $.msg($.name, "🚀 启动签到", "正在读取本地凭证...");

  // (1) 读取存储的数据
  const auth = $.getdata(KEY_AUTH);
  const gToken = $.getdata(KEY_GTOKEN);
  const sign = $.getdata(KEY_SIGN);
  const timestamp = $.getdata(KEY_TIME);
  // 兜底 Body
  const body = $.getdata(KEY_BODY) || JSON.stringify({ "userId": "U1386021354645749760" });

  // (2) 检查数据完整性
  if (!auth || !gToken || !sign || !timestamp) {
    const missing = [];
    if (!auth) missing.push("Auth");
    if (!sign) missing.push("Sign");
    console.log(`❌ 缺失数据: ${missing.join(", ")}`);
    $.msg($.name, "🚫 缺少签名", "请去 App 签到页面，手动点击一次‘签到’按钮以捕获签名！");
    $.done();
    return;
  }

  // (3) 组装请求
  // 移除 Host，防止卡死
  const headers = {
    "AppID": "GWM-H5-110001",
    "sourceApp": "GWM",
    "Secret": "8bc742859a7849ec9a924c979afa5a9a",
    "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 fromappios sapp cVer=1.9.9",
    "Authtype": "BMP",
    "sourceAppVer": "1.9.9",
    "Origin": "https://hippo-app-hw.gwmapp-h.com",
    "sourcetype": "H5",
    "Accept": "application/json, text/plain, */*",
    "Content-Type": "application/json",
    
    // 使用动态抓取到的数据
    "sign": sign,
    "TimeStamp": timestamp,
    "Authorization": auth,
    "G-Token": gToken
  };

  const options = {
    url: SIGN_URL,
    method: "POST",
    headers: headers,
    body: body,
    timeout: 20000
  };

  $.post(options, (err, resp, data) => {
    if (err) {
      console.log("❌ 网络错误: " + JSON.stringify(err));
      $.msg($.name, "🚫 网络失败", "无法连接长城服务器");
      $.done();
      return;
    }

    try {
      console.log("服务器响应: " + data);
      const result = JSON.parse(data);

      if (result.code == 200 || result.success || (result.message && result.message.includes("成功"))) {
        const score = result.data ? `积分: ${result.data}` : "";
        $.msg($.name, "✅ 签到成功", `结果: ${result.message} ${score}`);
      } else if (result.code == 401 || (result.message && result.message.includes("sign"))) {
        // 如果依然报 401，说明签名是一次性的或已过期
        $.msg($.name, "⚠️ 签名失效", "请重新点击 App 里的签到按钮，抓取最新签名。");
      } else {
        $.msg($.name, "⚠️ 签到反馈", `提示: ${result.message}`);
      }
    } catch (e) {
      console.log("解析错误: " + e);
      $.msg($.name, "❌ 异常", "数据解析失败");
    }
    
    $.done();
  });
}

// -------------------------------------------------------
// 5. Env 工具函数
// -------------------------------------------------------
function Env(name) {
  return new class {
    constructor(name) { this.name = name; }
    msg(title, sub, desc) {
      if (typeof $notify !== "undefined") $notify(title, sub, desc);
      console.log(`[${title}] ${sub} - ${desc}`);
    }
    setdata(val, key) {
      if (typeof $prefs !== "undefined") return $prefs.setValueForKey(val, key);
      if (typeof $persistentStore !== "undefined") return $persistentStore.write(val, key);
    }
    getdata(key) {
      if (typeof $prefs !== "undefined") return $prefs.valueForKey(key);
      if (typeof $persistentStore !== "undefined") return $persistentStore.read(key);
    }
    post(opts, cb) {
      if (typeof $task !== "undefined") {
        $task.fetch(opts).then(
          resp => cb(null, resp, resp.body),
          err => cb(err, null, null)
        );
      }
    }
    done() {
      if (typeof $done !== "undefined") $done({});
    }
  }(name);
}
