/*
长城/哈弗汽车自动签到
项目名称: GWM Auto Sign (Fix 401)
脚本作者: Gemini & Duoxiong
更新时间: 2026-01-22
使用说明: 
1. 首次使用：打开 App 进入签到页(触发Token抓取)，然后点击一次“签到”按钮(触发签名抓取)。
2. 每日 9:00 自动执行。

[rewrite_local]
# 匹配规则：同时监听 sign/info (你指定的) 和 sureNew (实际签到接口)
^https:\/\/gwm-api\.gwmapp-h\.com\/community-u\/v1\/(app\/uc\/sign\/info|user\/sign\/sureNew) url script-request-body https://raw.githubusercontent.com/duoxiong/Quantumult-X/refs/heads/main/rewrite/gwm_sign.js

[task_local]
0 9 * * * https://raw.githubusercontent.com/duoxiong/Quantumult-X/refs/heads/main/rewrite/gwm_sign.js, tag=长城汽车签到, img-url=https://raw.githubusercontent.com/Orz-3/mini/master/Color/GWM.png, enabled=true

[mitm]
hostname = gwm-api.gwmapp-h.com
*/

const $ = new Env("长城汽车签到");

// -------------------------------------------------------
// 1. 数据 Key
// -------------------------------------------------------
const KEY_AUTH = "duoxiong_gwm_auth";       // 身份 Authorization
const KEY_GTOKEN = "duoxiong_gwm_gtoken";   // 身份 G-Token
const KEY_SIGN = "duoxiong_gwm_sign";       // 动态签名 Sign
const KEY_TIME = "duoxiong_gwm_timestamp";  // 动态时间戳 TimeStamp
// 签到动作接口
const SIGN_ACTION_URL = "https://gwm-api.gwmapp-h.com/community-u/v1/user/sign/sureNew";

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
// 3. 抓取逻辑 (核心修复)
// -------------------------------------------------------
function GetCookie() {
  const url = $request.url;
  const headers = $request.headers;
  
  // 1. 定义变量
  let capturedToken = false;
  let capturedSign = false;
  
  let newAuth = null;
  let newToken = null;
  let newSign = null;
  let newTime = null;

  // 2. 遍历提取 Headers (忽略大小写)
  for (let key in headers) {
    const k = key.toLowerCase();
    if (k === "authorization") newAuth = headers[key];
    if (k === "g-token") newToken = headers[key];
    if (k === "sign") newSign = headers[key];
    if (k === "timestamp") newTime = headers[key];
  }

  // 3. 场景 A: 在 sign/info (进页面) 抓取 Token
  if (url.indexOf("sign/info") > -1) {
    if (newAuth || newToken) {
      if (newAuth) $.setdata(newAuth, KEY_AUTH);
      if (newToken) $.setdata(newToken, KEY_GTOKEN);
      capturedToken = true;
      console.log(`[进页面] 已捕获 Token: ${url}`);
    }
  }

  // 4. 场景 B: 在 sureNew (点按钮) 抓取 签名 (解决 401 的关键)
  if (url.indexOf("sign/sureNew") > -1) {
    if (newSign && newTime) {
      $.setdata(newSign, KEY_SIGN);
      $.setdata(newTime, KEY_TIME);
      // 点按钮时肯定也有 Token，顺便更新一下
      if (newAuth) $.setdata(newAuth, KEY_AUTH);
      if (newToken) $.setdata(newToken, KEY_GTOKEN);
      capturedSign = true;
      console.log(`[点按钮] 已捕获 签名(Sign): ${newSign}`);
    }
  }

  // 5. 弹窗提示
  if (capturedSign) {
    $.msg($.name, "🎉 完整凭证已捕获", "签名 & Token 全部更新，脚本已复活！");
  } else if (capturedToken) {
    // 只抓到了 Token，提示用户还需要点一下按钮
    $.msg($.name, "✅ Token 已捕获", "请继续点击页面上的‘签到’按钮，以获取最新签名！");
  }
}

// -------------------------------------------------------
// 4. 签到逻辑 (SignIn)
// -------------------------------------------------------
async function SignIn() {
  $.msg($.name, "🚀 启动签到", "正在读取凭证...");

  const auth = $.getdata(KEY_AUTH);
  const gToken = $.getdata(KEY_GTOKEN);
  const sign = $.getdata(KEY_SIGN);
  const timestamp = $.getdata(KEY_TIME);
  
  // 你的固定 UserId (兜底)
  const defaultBody = JSON.stringify({ "userId": "U1386021354645749760" });

  // 检查是否缺数据
  if (!auth || !gToken) {
    $.msg($.name, "🚫 缺少 Token", "请进入 App 签到页面触发抓取");
    $.done(); return;
  }
  if (!sign || !timestamp) {
    $.msg($.name, "🚫 缺少签名", "请在 App 内手动点击一次‘签到’按钮 (解决 401 报错)");
    $.done(); return;
  }

  const headers = {
    "Host": "gwm-api.gwmapp-h.com",
    "AppID": "GWM-H5-110001",
    "sourceApp": "GWM",
    "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 fromappios sapp cVer=1.9.9",
    "Authtype": "BMP",
    "Accept": "application/json, text/plain, */*",
    "Content-Type": "application/json",
    
    // 使用全套动态抓取的数据
    "Authorization": auth,
    "G-Token": gToken,
    "sign": sign,
    "TimeStamp": timestamp
  };

  const options = {
    url: SIGN_ACTION_URL,
    method: "POST",
    headers: headers,
    body: defaultBody,
    timeout: 20000
  };

  $.post(options, (err, resp, data) => {
    if (err) {
      console.log("❌ 网络错误: " + JSON.stringify(err));
      $.msg($.name, "🚫 网络失败", "无法连接服务器");
      $.done(); return;
    }

    try {
      console.log("服务器响应: " + data);
      const result = JSON.parse(data);

      if (result.code == 200 || result.success || (result.message && result.message.includes("成功"))) {
        const score = result.data ? `积分: ${result.data}` : "";
        $.msg($.name, "✅ 签到成功", `结果: ${result.message} ${score}`);
      } else if (result.code == 401) {
        $.msg($.name, "⚠️ 签名失效", "签名是一次性的，请重新去 App 点击签到按钮刷新。");
      } else {
        $.msg($.name, "⚠️ 签到反馈", `提示: ${result.message}`);
      }
    } catch (e) {
      $.msg($.name, "❌ 异常", "服务端返回非 JSON 数据");
    }
    
    $.done();
  });
}

// -------------------------------------------------------
// 5. Env 工具
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
