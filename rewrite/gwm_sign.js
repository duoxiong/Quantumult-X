/*
长城/哈弗汽车自动签到
项目名称: GWM Auto Sign (Final Stable)
脚本作者: Gemini & Duoxiong
更新时间: 2026-01-22
核心特性: 
1. 全字段动态克隆 (Token/Sign/UA/Body/DeviceId)。
2. 彻底移除硬编码，支持多账号/换号自动适配。
3. 解决 401 签名失效问题。

使用说明: 
1. 首次使用：打开 App 签到页(抓取身份)，然后点击“签到”按钮(抓取核心签名及Body)。
2. 每日 9:00 自动执行。

[rewrite_local]
# 核心抓取规则：开启 Body 捕获模式
^https:\/\/gwm-api\.gwmapp-h\.com\/community-u\/v1\/(app\/uc\/sign\/info|user\/sign\/sureNew) url script-request-body https://raw.githubusercontent.com/duoxiong/Quantumult-X/refs/heads/main/rewrite/gwm_sign.js

[task_local]
# 每日 9:00 执行
0 9 * * * https://raw.githubusercontent.com/duoxiong/Quantumult-X/refs/heads/main/rewrite/gwm_sign.js, tag=长城汽车签到, img-url=https://raw.githubusercontent.com/Orz-3/mini/master/Color/GWM.png, enabled=true

[mitm]
hostname = gwm-api.gwmapp-h.com
*/

const $ = new Env("长城汽车签到");

// -------------------------------------------------------
// 🗄 数据存储 Key (持久化)
// -------------------------------------------------------
const KEY_AUTH = "duoxiong_gwm_auth";       // 身份 Authorization
const KEY_GTOKEN = "duoxiong_gwm_gtoken";   // 身份 G-Token
const KEY_SIGN = "duoxiong_gwm_sign";       // 动态签名 Sign
const KEY_TIME = "duoxiong_gwm_timestamp";  // 动态时间戳 TimeStamp
const KEY_UA = "duoxiong_gwm_ua";           // User-Agent (真实设备指纹)
const KEY_DID = "duoxiong_gwm_deviceid";    // DeviceId (设备ID)
const KEY_BODY = "duoxiong_gwm_body";       // Request Body (账号信息)

// 签到动作接口
const SIGN_ACTION_URL = "https://gwm-api.gwmapp-h.com/community-u/v1/user/sign/sureNew";

// -------------------------------------------------------
// 🚦 逻辑入口
// -------------------------------------------------------
const isGetCookie = typeof $request !== "undefined";
if (isGetCookie) {
  GetCookie();
  $.done();
} else {
  SignIn();
}

// -------------------------------------------------------
// 📡 1. 全字段抓取逻辑 (GetCookie)
// -------------------------------------------------------
function GetCookie() {
  const url = $request.url;
  const headers = $request.headers;
  let body = $request.body;
  
  // 临时存储
  let capturedData = {};

  // 1. 遍历 Headers (全小写匹配，兼容性最佳)
  for (let key in headers) {
    const k = key.toLowerCase();
    if (k === "authorization") capturedData.auth = headers[key];
    if (k === "g-token") capturedData.gtoken = headers[key];
    if (k === "sign") capturedData.sign = headers[key];
    if (k === "timestamp") capturedData.time = headers[key];
    if (k === "user-agent") capturedData.ua = headers[key];
    if (k === "deviceid" || k === "device-id") capturedData.did = headers[key];
  }

  // 2. 场景A: 进入页面 (sign/info) -> 抓取基础身份
  if (url.indexOf("sign/info") > -1) {
    if (capturedData.auth || capturedData.gtoken) {
      if (capturedData.auth) $.setdata(capturedData.auth, KEY_AUTH);
      if (capturedData.gtoken) $.setdata(capturedData.gtoken, KEY_GTOKEN);
      if (capturedData.ua) $.setdata(capturedData.ua, KEY_UA);
      if (capturedData.did) $.setdata(capturedData.did, KEY_DID);

      console.log(`[身份捕获] 来源: sign/info`);
      // 仅日志记录，不弹窗，以免此时还未点击签到按钮导致误解
    }
  }

  // 3. 场景B: 点击按钮 (sureNew) -> 抓取核心数据 (Body/Sign)
  if (url.indexOf("sureNew") > -1) {
    // 确保 Body 是字符串格式 (防错处理)
    if (typeof body === "object") {
      try { body = JSON.stringify(body); } catch(e) {}
    }

    // 只有在 Body 和 Sign 都存在时才保存，确保数据完整
    if (capturedData.sign && capturedData.time && body) {
      $.setdata(capturedData.sign, KEY_SIGN);
      $.setdata(capturedData.time, KEY_TIME);
      $.setdata(body, KEY_BODY); 
      
      // 二次确认，防止漏抓
      if (capturedData.ua) $.setdata(capturedData.ua, KEY_UA); 
      if (capturedData.did) $.setdata(capturedData.did, KEY_DID);
      if (capturedData.auth) $.setdata(capturedData.auth, KEY_AUTH);
      if (capturedData.gtoken) $.setdata(capturedData.gtoken, KEY_GTOKEN);

      console.log(`[完美抓取] 签名: ${capturedData.sign}`);
      $.msg($.name, "🎉 完整凭证已捕获", "签名、账号及设备信息已全部备份，明日自动签到！");
    }
  }
}

// -------------------------------------------------------
// 🚀 2. 签到逻辑 (SignIn)
// -------------------------------------------------------
async function SignIn() {
  $.msg($.name, "🚀 启动签到", "正在组装克隆请求...");

  // 1. 读取全套数据
  const auth = $.getdata(KEY_AUTH);
  const gToken = $.getdata(KEY_GTOKEN);
  const sign = $.getdata(KEY_SIGN);
  const timestamp = $.getdata(KEY_TIME);
  const body = $.getdata(KEY_BODY); 
  const ua = $.getdata(KEY_UA) || "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 fromappios sapp cVer=1.9.9";
  const did = $.getdata(KEY_DID); 

  // 2. 严谨检查
  if (!auth || !gToken) {
    $.msg($.name, "🚫 身份丢失", "请进入 App 签到页触发抓取");
    $.done(); return;
  }
  if (!sign || !body) {
    $.msg($.name, "⚠️ 数据不全", "请务必点击一次‘签到’按钮以捕获签名和账号信息");
    $.done(); return;
  }

  // 3. 组装 headers
  const headers = {
    "AppID": "GWM-H5-110001",
    "sourceApp": "GWM",
    "Authtype": "BMP",
    "Accept": "application/json, text/plain, */*",
    "Content-Type": "application/json",
    "User-Agent": ua,
    "Authorization": auth,
    "G-Token": gToken,
    "sign": sign,
    "TimeStamp": timestamp
  };

  // 注入设备ID (如果抓到了)
  if (did) { headers["DeviceId"] = did; }

  const options = {
    url: SIGN_ACTION_URL,
    method: "POST",
    headers: headers,
    body: body, // 使用抓取到的真实 Body
    timeout: 20000
  };

  $.post(options, (err, resp, data) => {
    if (err) {
      console.log("❌ 网络错误: " + JSON.stringify(err));
      $.msg($.name, "🚫 网络失败", "无法连接服务器");
    } else {
      try {
        console.log("服务器返回: " + data);
        const res = JSON.parse(data);
        
        if (res.code == 200 || res.success || (res.message && res.message.indexOf("成功") > -1)) {
          const score = res.data ? ` (积分: ${res.data})` : "";
          $.msg($.name, "✅ 签到成功", `结果: ${res.message}${score}`);
        } else if (res.code == 401 || (res.message && res.message.indexOf("sign") > -1)) {
          $.msg($.name, "⚠️ 签名失效", "请手动点击签到按钮刷新签名");
        } else {
          $.msg($.name, "⚠️ 签到反馈", res.message);
        }
      } catch (e) {
        $.msg($.name, "❌ 解析异常", "服务端数据非 JSON");
      }
    }
    $.done();
  });
}

// -------------------------------------------------------
// 🛠 Env 工具
// -------------------------------------------------------
function Env(t){return new class{constructor(t){this.name=t}msg(t,e,s){if("undefined"!=typeof $notify)$notify(t,e,s);console.log(`[${t}] ${e} - ${s}`)}setdata(t,e){return"undefined"!=typeof $prefs?$prefs.setValueForKey(t,e):"undefined"!=typeof $persistentStore?$persistentStore.write(t,e):void 0}getdata(t){return"undefined"!=typeof $prefs?$prefs.valueForKey(t):"undefined"!=typeof $persistentStore?$persistentStore.read(t):void 0}done(){"undefined"!=typeof $done&&$done({})}}(t)}
