/*
长城/哈弗汽车自动签到
项目名称: GWM Auto Sign
脚本作者: Gemini & Duoxiong
更新时间: 2026-01-22
使用说明: 
1. 进入 App 签到页面，等待弹出“🎉 凭证已捕获”。
2. 每日 9:00 自动执行签到。

[rewrite_local]
# 🔥 核心抓取规则：锁定 sign/info 接口
^https:\/\/gwm-api\.gwmapp-h\.com\/community-u\/v1\/app\/uc\/sign\/info url script-request-body https://raw.githubusercontent.com/duoxiong/Quantumult-X/refs/heads/main/rewrite/gwm_sign.js

[task_local]
# 每日 9:00 执行签到
0 9 * * * https://raw.githubusercontent.com/duoxiong/Quantumult-X/refs/heads/main/rewrite/gwm_sign.js, tag=长城汽车签到, img-url=https://raw.githubusercontent.com/Orz-3/mini/master/Color/GWM.png, enabled=true

[mitm]
hostname = gwm-api.gwmapp-h.com
*/

const $ = new Env("长城汽车签到");

// -------------------------------------------------------
// 1. 数据存储 Key
// -------------------------------------------------------
const KEY_AUTH = "duoxiong_gwm_auth";       // 身份 Authorization
const KEY_GTOKEN = "duoxiong_gwm_gtoken";   // 身份 G-Token
// 签到专用接口 (注意：抓取的是 info，但签到要发给 sureNew)
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
// 3. 抓取逻辑 (GetCookie)
// -------------------------------------------------------
function GetCookie() {
  const url = $request.url;
  const headers = $request.headers;
  
  // 仅当 URL 包含 sign/info 时触发
  if (url.indexOf("sign/info") > -1) {
    let newAuth = null;
    let newToken = null;

    // 遍历 Headers (忽略大小写)寻找 Token
    for (let key in headers) {
      if (key.toLowerCase() === "authorization") newAuth = headers[key];
      if (key.toLowerCase() === "g-token") newToken = headers[key];
    }

    // 只要抓到 Token 就保存
    if (newAuth || newToken) {
      if (newAuth) $.setdata(newAuth, KEY_AUTH);
      if (newToken) $.setdata(newToken, KEY_GTOKEN);

      console.log(`[精准抓取] 来源: ${url}`);
      console.log(`[抓取详情] Auth: ${newAuth ? "✅" : "❌"}, G-Token: ${newToken ? "✅" : "❌"}`);
      
      $.msg($.name, "🎉 凭证已捕获", "已从 sign/info 接口获取最新 Token！");
    }
  }
}

// -------------------------------------------------------
// 4. 签到逻辑 (SignIn)
// -------------------------------------------------------
async function SignIn() {
  $.msg($.name, "🚀 启动签到", "正在读取凭证...");

  // (1) 读取存储的凭证
  const auth = $.getdata(KEY_AUTH);
  const gToken = $.getdata(KEY_GTOKEN);
  
  // 兜底配置 (你可以把你的 userId 填在这里作为备用)
  const defaultBody = JSON.stringify({ "userId": "U1386021354645749760" });
  
  // 固定的有效签名 (用于绕过动态签名验证，如果过期需重新抓)
  const staticSign = "a70f912f8a1e1d0b6b848b60cc52591f3d2a12bea25ec781ad13f9e4192474ce";
  const staticTime = "1769043392226";

  // (2) 检查凭证
  if (!auth || !gToken) {
    $.msg($.name, "🚫 无法签到", "请先进入 App 签到页面触发抓取！");
    $.done();
    return;
  }

  // (3) 组装请求
  // 注意：这里使用刚才抓到的 Auth/Token，加上固定的 Sign/Time
  const headers = {
    "Host": "gwm-api.gwmapp-h.com",
    "AppID": "GWM-H5-110001",
    "sourceApp": "GWM",
    "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 fromappios sapp cVer=1.9.9",
    "Authtype": "BMP",
    "Accept": "application/json, text/plain, */*",
    "Content-Type": "application/json",
    
    // 组合拳：最新 Token + 静态签名
    "Authorization": auth,
    "G-Token": gToken,
    "sign": staticSign,
    "TimeStamp": staticTime
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
      $.done();
      return;
    }

    try {
      console.log("服务器响应: " + data);
      const result = JSON.parse(data);

      if (result.code == 200 || result.success || (result.message && result.message.includes("成功"))) {
        const score = result.data ? `积分: ${result.data}` : "";
        $.msg($.name, "✅ 签到成功", `结果: ${result.message} ${score}`);
      } else if (result.code == 401) {
        $.msg($.name, "⚠️ 签名过期", "请手动点击一次‘签到’按钮来刷新签名");
      } else {
        $.msg($.name, "⚠️ 签到反馈", `提示: ${result.message}`);
      }
    } catch (e) {
      $.msg($.name, "❌ 异常", "服务端返回数据非 JSON");
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
