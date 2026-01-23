/*
长城/哈弗汽车自动签到 (原生防卡死版)
项目名称: GWM Auto Sign (Native)
更新时间: 2026-01-22
核心修复: 
1. 移除 Env 包装类，直接使用 $task.fetch 原生请求，减少中间环节。
2. 彻底清洗请求头，只保留 5 个核心参数，杜绝死锁。
3. 增加 Body 清洗逻辑，防止数据格式错误导致卡顿。

使用方法:
你之前已经抓取成功了，更新代码后，直接去任务列表点击运行即可！
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

// 判断是 重写(抓包) 还是 任务(签到)
if (typeof $request !== "undefined") {
  GetCookie();
} else {
  SignIn();
}

// -------------------------------------------------------
// 📡 1. 抓取逻辑 (保持稳定，只做记录)
// -------------------------------------------------------
function GetCookie() {
  const url = $request.url;
  
  // 针对 sign/info 接口抓取 (你指定的)
  if (url.indexOf("app/uc/sign/info") > -1) {
    const headers = $request.headers;
    let auth, gtoken;
    
    for (let key in headers) {
      const k = key.toLowerCase();
      if (k === "authorization") auth = headers[key];
      if (k === "g-token") gtoken = headers[key];
    }
    
    if (auth && gtoken) {
      $prefs.setValueForKey(auth, KEY_AUTH);
      $prefs.setValueForKey(gtoken, KEY_GTOKEN);
      // 这里的 notify 可能会弹窗，证明抓取还在工作
      // $notify("长城汽车", "✅ 身份已捕获", "请去任务列表执行签到");
    }
  }
  
  $done({});
}

// -------------------------------------------------------
// 🚀 2. 签到逻辑 (原生 fetch，杜绝卡死)
// -------------------------------------------------------
function SignIn() {
  console.log("🟢 [开始] 正在读取本地数据...");

  // 1. 读取数据
  const auth = $prefs.valueForKey(KEY_AUTH);
  const gToken = $prefs.valueForKey(KEY_GTOKEN);
  const sign = $prefs.valueForKey(KEY_SIGN);
  const timestamp = $prefs.valueForKey(KEY_TIME);
  let bodyStr = $prefs.valueForKey(KEY_BODY);

  // 2. 核心数据完整性检查
  if (!auth || !gToken || !sign) {
    console.log("🔴 [错误] 数据缺失");
    $notify("长城汽车", "🚫 无法运行", "缺少签名/Token，请重新抓取");
    $done();
    return;
  }

  // 3. Body 清洗 (防止 Body 损坏导致卡死)
  // 如果没抓到 Body，使用默认 ID 兜底，保证请求能发出去
  if (!bodyStr || bodyStr === "undefined" || bodyStr === "[object Object]") {
    console.log("🟠 [警告] Body 异常，使用默认 UserID");
    bodyStr = JSON.stringify({ "userId": "U1386021354645749760" });
  }

  // 4. 组装请求 - ⚠️ 极度精简，防卡死关键 ⚠️
  // 绝对不要带 Host, Connection, Origin, Content-Length
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

  console.log("🟡 [发送] 正在发起网络请求...");

  // 5. 使用原生 $task.fetch (不经过任何封装)
  $task.fetch(myRequest).then(response => {
    // 请求成功返回
    console.log(`🟢 [响应] 状态码: ${response.statusCode}`);
    
    try {
      const res = JSON.parse(response.body);
      
      if (res.code == 200 || res.success || (res.message && res.message.includes("成功"))) {
        const score = res.data ? `积分: ${res.data}` : "";
        $notify("长城汽车", "✅ 签到成功", `结果: ${res.message} ${score}`);
      } else if (res.code == 401) {
        $notify("长城汽车", "⚠️ 签名失效", "请点击App签到按钮刷新签名");
      } else {
        $notify("长城汽车", "⚠️ 签到反馈", res.message);
      }
    } catch (e) {
      console.log("🔴 [解析错误] " + e);
      $notify("长城汽车", "❌ 异常", "服务端返回非 JSON");
    }
    
    $done(); // 结束脚本
  }, reason => {
    // 请求失败 (网络错误)
    console.log("🔴 [网络错误] " + reason.error);
    $notify("长城汽车", "🚫 网络超时", "请求未到达服务器，请切换网络");
    $done(); // 结束脚本
  });
  
  // 6. 设置一个 8 秒的强制结束，防止 UI 一直转圈
  setTimeout(() => {
    console.log("⚪ [超时熔断] 脚本强制结束");
    $done();
  }, 8000);
}
