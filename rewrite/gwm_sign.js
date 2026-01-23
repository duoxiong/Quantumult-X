/*
长城/哈弗汽车自动签到 (浏览抓取版)
项目名称: GWM Auto Sign (Info Grab)
脚本作者: Gemini & Duoxiong
更新时间: 2026-01-22
使用说明: 
1. 首次使用：打开 App -> 点击“我的”或进入签到页面 (触发 info 接口即可抓取)。
2. 每日 9:00 自动执行签到。

[rewrite_local]
# 核心更改：拦截签到信息接口 (点击我的页面/签到首页触发)
^https:\/\/gwm-api\.gwmapp-h\.com\/community-u\/v1\/app\/uc\/sign\/info url script-request-body https://raw.githubusercontent.com/duoxiong/Quantumult-X/refs/heads/main/rewrite/gwm_sign.js

[task_local]
0 9 * * * https://raw.githubusercontent.com/duoxiong/Quantumult-X/refs/heads/main/rewrite/gwm_sign.js, tag=长城汽车签到, img-url=https://raw.githubusercontent.com/Orz-3/mini/master/Color/GWM.png, enabled=true

[mitm]
hostname = gwm-api.gwmapp-h.com
*/

const $ = new Env("长城汽车签到");

// -------------------------------------------------------
// 🗄 数据库 Key
// -------------------------------------------------------
const KEY_AUTH = "duoxiong_gwm_auth";
const KEY_GTOKEN = "duoxiong_gwm_gtoken";
const KEY_SIGN = "duoxiong_gwm_sign";
const KEY_TIME = "duoxiong_gwm_timestamp";
const KEY_UA = "duoxiong_gwm_ua";
// UserID 默认值 (如果 info 接口抓不到 Body，就用默认值或上次保存的)
const KEY_BODY = "duoxiong_gwm_body"; 

// 实际签到动作依然要发送给 sureNew，但我们从 info 接口偷数据
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
// 📡 1. 抓取逻辑 (针对 sign/info 优化)
// -------------------------------------------------------
function GetCookie() {
  const url = $request.url;
  
  // 仅针对你指定的 info 接口
  if (url.indexOf("app/uc/sign/info") > -1) {
    const headers = $request.headers;
    
    let captured = {};
    // 遍历 Headers
    for (let key in headers) {
      const k = key.toLowerCase();
      if (k === "authorization") captured.auth = headers[key];
      if (k === "g-token") captured.gtoken = headers[key];
      if (k === "sign") captured.sign = headers[key];
      if (k === "timestamp") captured.time = headers[key];
      if (k === "user-agent") captured.ua = headers[key];
    }

    // 保存抓到的数据
    if (captured.auth && captured.gtoken) {
      $.setdata(captured.auth, KEY_AUTH);
      $.setdata(captured.gtoken, KEY_GTOKEN);
      
      // 尝试保存 Sign 和 Time (如果 info 接口有的话)
      if (captured.sign && captured.time) {
        $.setdata(captured.sign, KEY_SIGN);
        $.setdata(captured.time, KEY_TIME);
      }
      
      if (captured.ua) $.setdata(captured.ua, KEY_UA);

      console.log(`[抓取成功] 来源: sign/info`);
      $.msg($.name, "🎉 浏览抓取成功", "已保存身份信息，脚本准备就绪！");
    }
  }
}

// -------------------------------------------------------
// 🚀 2. 签到逻辑
// -------------------------------------------------------
async function SignIn() {
  $.msg($.name, "🚀 启动签到", "正在处理...");

  // 1. 读取数据
  const auth = $.getdata(KEY_AUTH);
  const gToken = $.getdata(KEY_GTOKEN);
  let sign = $.getdata(KEY_SIGN);
  let timestamp = $.getdata(KEY_TIME);
  const ua = $.getdata(KEY_UA) || "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 fromappios sapp cVer=1.9.9";
  
  // 读取保存的 Body，如果没有则使用硬编码兜底 (Info 接口通常是 GET，没 Body)
  let body = $.getdata(KEY_BODY);
  if (!body) {
     body = JSON.stringify({ "userId": "U1386021354645749760" });
  }

  // 2. 检查
  if (!auth || !gToken) {
    $.msg($.name, "🚫 无数据", "请先打开 App 浏览签到页面");
    $.done(); return;
  }
  
  // 如果 info 接口没带 sign，我们尝试用以前保存的，或者提示
  if (!sign) {
      console.log("提示: info 接口未携带 sign，尝试使用旧数据或跳过校验");
  }

  // 3. 组装请求
  const headers = {
    "Accept": "application/json, text/plain, */*",
    "Content-Type": "application/json",
    "AppID": "GWM-H5-110001",
    "sourceApp": "GWM",
    "Authtype": "BMP",
    "User-Agent": ua,
    "Authorization": auth,
    "G-Token": gToken,
    "sign": sign,           // 如果 info 接口没 sign，这里可能是 undefined，服务器可能报错
    "TimeStamp": timestamp
  };

  const options = {
    url: SIGN_ACTION_URL,
    method: "POST",
    headers: headers,
    body: body,
    timeout: 15000
  };

  $.post(options, (err, resp, data) => {
    if (err) {
      console.log("Err: " + JSON.stringify(err));
      $.msg($.name, "🚫 网络错误", "请检查网络");
      $.done(); return;
    }
    
    try {
      const res = JSON.parse(data);
      if (res.code == 200 || res.success || (res.message && res.message.includes("成功"))) {
        $.msg($.name, "✅ 签到成功", `结果: ${res.message} ${res.data || ""}`);
      } else {
        $.msg($.name, "⚠️ 签到反馈", res.message);
      }
    } catch (e) {
      $.msg($.name, "❌ 异常", "非 JSON 数据");
    }
    $.done();
  });
}

// -------------------------------------------------------
// 🛠 Env 工具
// -------------------------------------------------------
function Env(t){return new class{constructor(t){this.name=t}msg(t,e,s){if("undefined"!=typeof $notify)$notify(t,e,s);console.log(`[${t}] ${e} - ${s}`)}setdata(t,e){return"undefined"!=typeof $prefs?$prefs.setValueForKey(t,e):"undefined"!=typeof $persistentStore?$persistentStore.write(t,e):void 0}getdata(t){return"undefined"!=typeof $prefs?$prefs.valueForKey(t):"undefined"!=typeof $persistentStore?$persistentStore.read(t):void 0}done(){"undefined"!=typeof $done&&$done({})}}(t)}
