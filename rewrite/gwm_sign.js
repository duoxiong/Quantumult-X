/*
长城/哈弗汽车自动签到
项目名称: GWM Auto Sign
脚本作者: Gemini & Duoxiong
更新时间: 2026-01-22
使用说明: 
1. 首次使用请打开 App，点击“我的”或等待首页加载，直到弹出“凭证已捕获”。
2. 每日 9:00 自动执行签到。

[rewrite_local]
# 匹配 用户中心(点击我的)、车辆信息(首页)、App配置(启动)、启动广告 接口，全方位自动抓取
^https:\/\/(gapp-api|gw-app-gateway|bmp-api)\.gwmapp-h\.com\/(api-u\/v1\/app\/uc\/.*|app-api\/api\/v3\.0\/vehicle\/function\/item|config\/v1\/app\/config\/s0\/gwm-app-config|api-c\/v1\/app\/community\/advertisement\/launch) url script-request-body https://raw.githubusercontent.com/duoxiong/Quantumult-X/refs/heads/main/rewrite/gwm_sign.js

[task_local]
# 每日 9:00 执行签到
0 9 * * * https://raw.githubusercontent.com/duoxiong/Quantumult-X/refs/heads/main/rewrite/gwm_sign.js, tag=长城汽车签到, img-url=https://raw.githubusercontent.com/Orz-3/mini/master/Color/GWM.png, enabled=true

[mitm]
hostname = gapp-api.gwmapp-h.com, gw-app-gateway.gwmapp-h.com, bmp-api.gwmapp-h.com, gwm-api.gwmapp-h.com
*/

const $ = new Env("长城汽车签到");

// -------------------------------------------------------
// 1. 配置区域
// -------------------------------------------------------

// 存储 Key
const KEY_AUTH = "duoxiong_gwm_auth";
const KEY_GTOKEN = "duoxiong_gwm_gtoken";

// 🏆 签到核心配置
const SIGN_CONFIG = {
  url: "https://gwm-api.gwmapp-h.com/community-u/v1/user/sign/sureNew",
  // 固定 UserID (你的账号)
  body: JSON.stringify({ "userId": "U1386021354645749760" }),
  // 固定签名 (验证过的有效签名)
  sign: "a70f912f8a1e1d0b6b848b60cc52591f3d2a12bea25ec781ad13f9e4192474ce",
  timestamp: "1769043392226"
};

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
  
  let newAuth = null;
  let newToken = null;

  // 遍历 Headers (忽略大小写)
  for (let key in headers) {
    if (key.toLowerCase() === "authorization") newAuth = headers[key];
    if (key.toLowerCase() === "g-token") newToken = headers[key];
  }

  // 只要抓到数据就保存
  if (newAuth || newToken) {
    if (newAuth) $.setdata(newAuth, KEY_AUTH);
    if (newToken) $.setdata(newToken, KEY_GTOKEN);

    // 简单弹窗提示
    // 为了防止首页多个接口并发导致弹窗刷屏，这里只在控制台打印详情
    console.log(`[自动抓取] 来源: ${url}`);
    
    // 只有当两个都齐全时，才弹窗提示（或者你可以选择每次更新都弹窗）
    if (newAuth && newToken) {
       $.msg($.name, "🎉 凭证已捕获", "Token 已保存，签到脚本准备就绪！");
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

  // (2) 检查凭证是否存在
  if (!auth || !gToken) {
    console.log("❌ 失败：未找到 Authorization 或 G-Token");
    $.msg($.name, "🚫 无法签到", "数据为空！请打开 App 点击“我的”或等待首页加载进行抓取。");
    $.done();
    return;
  }

  // (3) 组装请求
  const headers = {
    "Host": "gwm-api.gwmapp-h.com",
    "AppID": "GWM-H5-110001",
    "sourceApp": "GWM",
    "Secret": "8bc742859a7849ec9a924c979afa5a9a",
    "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 fromappios sapp cVer=1.9.9",
    "Referer": "https://hippo-app-hw.gwmapp-h.com/",
    "Authtype": "BMP",
    "sourceAppVer": "1.9.9",
    "Origin": "https://hippo-app-hw.gwmapp-h.com",
    "sourcetype": "H5",
    "Sec-Fetch-Site": "same-site",
    "Sec-Fetch-Dest": "empty",
    "Accept": "application/json, text/plain, */*",
    "Content-Type": "application/json",
    
    // 核心参数
    "sign": SIGN_CONFIG.sign,
    "TimeStamp": SIGN_CONFIG.timestamp,
    "Authorization": auth,
    "G-Token": gToken
  };

  const options = {
    url: SIGN_CONFIG.url,
    method: "POST",
    headers: headers,
    body: SIGN_CONFIG.body,
    timeout: 20000
  };

  // (4) 发送请求
  $.post(options, (err, resp, data) => {
    if (err) {
      console.log("❌ 网络错误: " + JSON.stringify(err));
      $.msg($.name, "🚫 网络请求失败", "请检查网络或代理设置");
      $.done();
      return;
    }

    try {
      console.log("服务器响应: " + data);
      const result = JSON.parse(data);

      if (result.code == 200 || result.success || (result.message && result.message.includes("成功"))) {
        const score = result.data ? `积分: ${result.data}` : "";
        $.msg($.name, "✅ 签到成功", `结果: ${result.message} ${score}`);
      } else {
        $.msg($.name, "⚠️ 签到反馈", `提示: ${result.message}`);
      }
    } catch (e) {
      console.log("解析错误: " + e);
      $.msg($.name, "❌ 数据异常", "服务端返回数据非 JSON");
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
