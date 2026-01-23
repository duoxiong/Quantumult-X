/*
长城/哈弗汽车自动签到
项目名称: GWM Auto Sign (Lite Speed)
脚本作者: Gemini & Duoxiong
更新时间: 2026-01-22
版本特性: 
1. 抓取逻辑保持不变（既然已成功，就不要动）。
2. 签到逻辑“极度精简”，移除所有可能导致卡死的冗余头。
3. 增加 8秒 极速超时设置，防止无限转圈。

[rewrite_local]
^https:\/\/gwm-api\.gwmapp-h\.com\/community-u\/v1\/(app\/uc\/sign\/info|user\/sign\/sureNew) url script-request-body https://raw.githubusercontent.com/duoxiong/Quantumult-X/refs/heads/main/rewrite/gwm_sign.js

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
const KEY_BODY = "duoxiong_gwm_body";
// UA 我们这次只存不强制用，签到时用默认的防卡死
const KEY_UA = "duoxiong_gwm_ua"; 

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
// 📡 1. 抓取逻辑 (保持原样，稳定不动)
// -------------------------------------------------------
function GetCookie() {
  const url = $request.url;
  const headers = $request.headers;
  let reqBody = $request.body;
  
  let capturedData = {};
  for (let key in headers) {
    const k = key.toLowerCase();
    if (k === "authorization") capturedData.auth = headers[key];
    if (k === "g-token") capturedData.gtoken = headers[key];
    if (k === "sign") capturedData.sign = headers[key];
    if (k === "timestamp") capturedData.time = headers[key];
    if (k === "user-agent") capturedData.ua = headers[key];
  }

  if (url.indexOf("sign/info") > -1) {
    if (capturedData.auth) $.setdata(capturedData.auth, KEY_AUTH);
    if (capturedData.gtoken) $.setdata(capturedData.gtoken, KEY_GTOKEN);
    // 仅日志，不弹窗
    console.log("[身份更新] sign/info");
  }

  if (url.indexOf("sureNew") > -1) {
    if (reqBody && typeof reqBody === "object") {
      try { reqBody = JSON.stringify(reqBody); } catch(e) {}
    }
    if (capturedData.sign && capturedData.time && reqBody) {
      $.setdata(capturedData.sign, KEY_SIGN);
      $.setdata(capturedData.time, KEY_TIME);
      $.setdata(reqBody, KEY_BODY);
      if (capturedData.ua) $.setdata(capturedData.ua, KEY_UA);
      
      console.log(`[抓取成功] Sign: ${capturedData.sign}`);
      $.msg($.name, "🎉 数据已就绪", "签到脚本配置完成，请手动运行任务测试！");
    }
  }
}

// -------------------------------------------------------
// 🚀 2. 签到逻辑 (极速精简版)
// -------------------------------------------------------
async function SignIn() {
  $.msg($.name, "🚀 启动签到", "正在发送请求...");

  // 1. 读取数据
  const auth = $.getdata(KEY_AUTH);
  const gToken = $.getdata(KEY_GTOKEN);
  const sign = $.getdata(KEY_SIGN);
  const timestamp = $.getdata(KEY_TIME);
  const body = $.getdata(KEY_BODY);

  // 2. 快速校验
  if (!auth || !gToken || !sign || !body) {
    $.msg($.name, "🚫 数据缺失", "请先去App点击签到按钮抓取数据");
    $.done(); return;
  }

  // 3. 组装最纯净的请求头
  // 剔除 User-Agent、DeviceId 等所有非必须字段，防止网络层卡死
  const headers = {
    "Content-Type": "application/json;charset=utf-8",
    "AppID": "GWM-H5-110001",
    "sourceApp": "GWM",
    "Authtype": "BMP",
    "Authorization": auth,
    "G-Token": gToken,
    "sign": sign,
    "TimeStamp": timestamp
  };

  const options = {
    url: SIGN_ACTION_URL,
    method: "POST",
    headers: headers,
    body: body,
    timeout: 8000 // 8秒强制超时，防止无限转圈
  };

  // 4. 发送请求
  console.log("正在请求: " + SIGN_ACTION_URL);
  
  $.post(options, (err, resp, data) => {
    // A. 处理网络错误
    if (err) {
      console.log("❌ 网络错误: " + JSON.stringify(err));
      // 这里的 timeout 错误通常是 "Request timeout"
      $.msg($.name, "🚫 请求超时", "网络连接耗时过长，请切换网络后重试");
      $.done();
      return;
    }

    // B. 处理业务响应
    try {
      console.log("Server Response: " + data);
      const res = JSON.parse(data);
      
      if (res.code == 200 || res.success || (res.message && res.message.indexOf("成功") > -1)) {
        const score = res.data ? ` (积分: ${res.data})` : "";
        $.msg($.name, "✅ 签到成功", `结果: ${res.message}${score}`);
      } else if (res.code == 401 || (res.message && res.message.indexOf("sign") > -1)) {
        $.msg($.name, "⚠️ 签名失效", "请重新点击App内的签到按钮刷新签名");
      } else {
        $.msg($.name, "⚠️ 签到反馈", res.message);
      }
    } catch (e) {
      console.log("解析错误: " + e);
      $.msg($.name, "❌ 异常", "服务端返回数据异常");
    }
    
    $.done();
  });
}

// -------------------------------------------------------
// 🛠 Env 工具
// -------------------------------------------------------
function Env(t){return new class{constructor(t){this.name=t}msg(t,e,s){if("undefined"!=typeof $notify)$notify(t,e,s);console.log(`[${t}] ${e} - ${s}`)}setdata(t,e){return"undefined"!=typeof $prefs?$prefs.setValueForKey(t,e):"undefined"!=typeof $persistentStore?$persistentStore.write(t,e):void 0}getdata(t){return"undefined"!=typeof $prefs?$prefs.valueForKey(t):"undefined"!=typeof $persistentStore?$persistentStore.read(t):void 0}done(){"undefined"!=typeof $done&&$done({})}}(t)}
