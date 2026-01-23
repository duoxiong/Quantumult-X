/*
长城/哈弗汽车自动签到 (配置集成版)
项目名称: GWM Auto Sign (Integrated)
更新时间: 2026-01-22
脚本特性:
1. 集成配置：头部包含 Rewrite/Task/MitM，引用即可生效。
2. 极速内核：采用 $task.fetch 原生请求，移除冗余头，杜绝卡死。
3. 双向抓取：支持“我的页面”(Token) 和 “签到按钮”(Sign) 自动抓取。

[rewrite_local]
# 匹配 "我的页面(info)" 和 "签到按钮(sureNew)"
^https:\/\/gwm-api\.gwmapp-h\.com\/community-u\/v1\/(app\/uc\/sign\/info|user\/sign\/sureNew) url script-request-body https://raw.githubusercontent.com/duoxiong/Quantumult-X/refs/heads/main/rewrite/gwm_sign.js

[task_local]
# 每日 9:00 执行签到
0 0 12 * * ? https://raw.githubusercontent.com/duoxiong/Quantumult-X/refs/heads/main/rewrite/gwm_sign.js, tag=长城汽车签到, img-url=https://raw.githubusercontent.com/Orz-3/mini/master/Color/GWM.png, enabled=true

[mitm]
hostname = gwm-api.gwmapp-h.com
*/

// -------------------------------------------------------
// 🗄 数据库 Key
// -------------------------------------------------------
const KEY_AUTH = "duoxiong_gwm_auth";
const KEY_GTOKEN = "duoxiong_gwm_gtoken";
const KEY_SIGN = "duoxiong_gwm_sign";
const KEY_TIME = "duoxiong_gwm_timestamp";
const KEY_BODY = "duoxiong_gwm_body";

const SIGN_URL = "https://gwm-api.gwmapp-h.com/community-u/v1/user/sign/sureNew";

// -------------------------------------------------------
// 🚦 逻辑入口
// -------------------------------------------------------

if (typeof $request !== "undefined") {
  GetCookie();
} else {
  SignIn();
}

// -------------------------------------------------------
// 📡 1. 抓取逻辑 (GetCookie)
// -------------------------------------------------------
function GetCookie() {
  const url = $request.url;
  const headers = $request.headers;
  let reqBody = $request.body;
  
  // 临时存储
  let val_auth, val_gtoken, val_sign, val_time;

  // 1. 遍历 Headers (转小写匹配)
  for (let key in headers) {
    const k = key.toLowerCase();
    if (k === "authorization") val_auth = headers[key];
    if (k === "g-token") val_gtoken = headers[key];
    if (k === "sign") val_sign = headers[key];
    if (k === "timestamp") val_time = headers[key];
  }

  // 2. 场景A: 拦截 "我的" 页面 (sign/info) -> 只更新 Token
  if (url.indexOf("app/uc/sign/info") > -1) {
    if (val_auth && val_gtoken) {
      $prefs.setValueForKey(val_auth, KEY_AUTH);
      $prefs.setValueForKey(val_gtoken, KEY_GTOKEN);
      console.log("[抓取] 身份信息(Token)已更新");
      // 这里的通知可选，为了不打扰你，我注释掉了，需要可开启
      // $notify("长城汽车", "✅ 身份已更新", "Token 已从“我的”页面捕获");
    }
  }

  // 3. 场景B: 拦截 "签到" 按钮 (sureNew) -> 更新 签名 & Body
  if (url.indexOf("user/sign/sureNew") > -1) {
    if (val_sign && val_time) {
      $prefs.setValueForKey(val_sign, KEY_SIGN);
      $prefs.setValueForKey(val_time, KEY_TIME);
      
      // 处理 Body
      if (reqBody) {
        if (typeof reqBody === "object") {
          try { reqBody = JSON.stringify(reqBody); } catch(e) {}
        }
        $prefs.setValueForKey(reqBody, KEY_BODY);
      }
      
      console.log(`[抓取] 核心签名(Sign)已更新: ${val_sign}`);
      $notify("长城汽车", "🎉 配置已完成", "核心签名已捕获，脚本准备就绪");
    }
  }
  
  $done({});
}

// -------------------------------------------------------
// 🚀 2. 签到逻辑 (原生 fetch 防卡死)
// -------------------------------------------------------
function SignIn() {
  console.log("🟢 [开始] 准备签到...");

  // 1. 读取数据
  const auth = $prefs.valueForKey(KEY_AUTH);
  const gToken = $prefs.valueForKey(KEY_GTOKEN);
  const sign = $prefs.valueForKey(KEY_SIGN);
  const timestamp = $prefs.valueForKey(KEY_TIME);
  let bodyStr = $prefs.valueForKey(KEY_BODY);

  // 2. 检查
  if (!auth || !gToken || !sign) {
    console.log("🔴 [错误] 数据缺失");
    $notify("长城汽车", "🚫 数据缺失", "请先在 App 内浏览“我的”页面或点击签到");
    $done();
    return;
  }

  // 3. Body 兜底
  if (!bodyStr || bodyStr === "undefined" || bodyStr === "[object Object]") {
    bodyStr = JSON.stringify({ "userId": "U1386021354645749760" });
  }

  // 4. 组装请求 (极简模式)
  const myRequest = {
    url: SIGN_URL,
    method: "POST",
    headers: {
      "Content-Type": "application/json;charset=utf-8",
      "Authtype": "BMP",
      "AppID": "GWM-H5-110001",
      "sourceApp": "GWM",
      "Authorization": auth,
      "G-Token": gToken,
      "sign": sign,
      "TimeStamp": timestamp
    },
    body: bodyStr
  };

  // 5. 发送 (增加超时熔断)
  const timer = setTimeout(() => {
    console.log("⚪ [熔断] 请求超时");
    $notify("长城汽车", "🚫 超时", "请求无响应，已强制结束");
    $done();
  }, 8000); // 8秒超时

  $task.fetch(myRequest).then(response => {
    clearTimeout(timer); // 清除定时器
    
    try {
      const res = JSON.parse(response.body);
      if (res.code == 200 || res.success || (res.message && res.message.includes("成功"))) {
        const score = res.data ? `积分: ${res.data}` : "";
        $notify("长城汽车", "✅ 签到成功", `结果: ${res.message} ${score}`);
      } else if (res.code == 401) {
        $notify("长城汽车", "⚠️ 签名失效", "请点击签到按钮刷新签名");
      } else {
        $notify("长城汽车", "⚠️ 签到反馈", res.message);
      }
    } catch (e) {
      $notify("长城汽车", "❌ 异常", "服务端返回非 JSON");
    }
    $done();
  }, reason => {
    clearTimeout(timer);
    $notify("长城汽车", "🚫 网络错误", "请求失败");
    $done();
  });
}
