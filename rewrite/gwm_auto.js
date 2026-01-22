/*
长城/哈弗汽车自动签到
项目名称: GWM Auto Sign
脚本作者: Gemini & Duoxiong
更新时间: 2026-01-22
使用说明: 打开 App 自动获取凭证，每日 9:00 自动签到。

[rewrite_local]
# 匹配车辆信息、App配置、广告启动、用户状态接口，自动捕获 Token
^https:\/\/(gw-app-gateway|bmp-api|gapp-api)\.gwmapp-h\.com\/(app-api\/api\/v3\.0\/vehicle\/function\/item|config\/v1\/app\/config\/s0\/gwm-app-config|api-c\/v1\/app\/community\/advertisement\/launch|api-u\/v1\/app\/uc\/getChangeActiveState) url script-request-body https://raw.githubusercontent.com/duoxiong/Quantumult-X/refs/heads/main/rewrite/gwm_auto.js

[task_local]
# 每日 9:00 执行签到
0 9 * * * https://raw.githubusercontent.com/duoxiong/Quantumult-X/refs/heads/main/rewrite/gwm_auto.js, tag=长城汽车签到, img-url=https://raw.githubusercontent.com/Orz-3/mini/master/Color/GWM.png, enabled=true

[mitm]
hostname = gw-app-gateway.gwmapp-h.com, bmp-api.gwmapp-h.com, gapp-api.gwmapp-h.com, gwm-api.gwmapp-h.com
*/

const $ = new Env("长城汽车签到");

// -------------------------------------------------------------
// 👇 1. 基础配置 (用户无需修改)
// -------------------------------------------------------------

// 存储 Key (持久化存储 Authorization 和 G-Token)
const key_auth = "duoxiong_gwm_auth";
const key_token = "duoxiong_gwm_gtoken";

// 🏆 签到接口固定配置
// 源自之前的成功抓包，用于组装请求
const SIGN_CONFIG = {
  url: "https://gwm-api.gwmapp-h.com/community-u/v1/user/sign/sureNew",
  // 固定 UserId (你的账号)
  body: JSON.stringify({ "userId": "U1386021354645749760" }),
  // 固定签名和时间戳 (绕过动态计算)
  sign: "a70f912f8a1e1d0b6b848b60cc52591f3d2a12bea25ec781ad13f9e4192474ce",
  timestamp: "1769043392226" 
};

// -------------------------------------------------------------
// 👇 2. 逻辑分发
// -------------------------------------------------------------

const isGetCookie = typeof $request !== "undefined";

if (isGetCookie) {
  GetCookie();
  $.done();
} else {
  SignIn();
}

// -------------------------------------------------------------
// 👇 3. 获取凭证 (Rewrite 模式)
// -------------------------------------------------------------
function GetCookie() {
  const url = $request.url;
  const headers = $request.headers;
  
  // 查找 Authorization 和 G-Token
  let newAuth = null;
  let newToken = null;

  // 遍历 Header (兼容大小写)
  for (let key in headers) {
    if (key.toLowerCase() === "authorization") newAuth = headers[key];
    if (key.toLowerCase() === "g-token") newToken = headers[key];
  }

  // 如果找到了任意一个有效凭证，就保存
  if (newAuth || newToken) {
    if (newAuth) $.setdata(newAuth, key_auth);
    if (newToken) $.setdata(newToken, key_token);

    // 提取接口名称，用于提示
    const apiName = url.split("?")[0].split("/").pop();
    
    // 避免频繁弹窗，只在控制台输出详情，界面上简单提示
    console.log(`[自动抓取] 来源: ${url}`);
    console.log(`[抓取详情] Auth: ${newAuth ? "✅" : "❌"}, G-Token: ${newToken ? "✅" : "❌"}`);
    
    $.msg($.name, "🎉 凭证自动续期", `已从 ${apiName} 接口更新鉴权信息`);
  }
}

// -------------------------------------------------------------
// 👇 4. 执行签到 (Task 模式)
// -------------------------------------------------------------
async function SignIn() {
  $.msg($.name, "🚀 启动签到", "正在组装请求...");

  // (1) 读取最新凭证
  // 优先读取抓取到的，如果没有(比如刚安装脚本)，使用预设的默认值
  const auth = $.getdata(key_auth) || "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJqd3RfdHlwZSI6MSwiand0VHlwZSI6MSwiYmVhbklkIjoiMzQ1MjQ2MTUzNzY0NzEyNDQ4MCIsImtleSI6ImJlYW4tYXBwLXVzZXIta2V5IiwiZ3dtQnJhbmQiOiJDQ0cwMDEiLCJpc3MiOiJnd3QgU2VydmVyIiwic3NvSWQiOiJVMTM4NjAyMTM1NDY0NTc0OTc2MCIsInJvbGVDb2RlIjoiYWRtaW4iLCJnd21ScyI6IjIiLCJnd0lkIjoiMzQ1MjQ2MTUzNzY0NzEyNDQ4MCIsImlhdCI6MTc2ODg3ODMwOSwiZXhwIjoxNzY5NDgzMTA5LCJjaGFubmVsIjoiNTlCMTEzMkItQzU5OS00NjRCLTgxMjgtOTc2Q0E1QTI0MkZDIn0.AJGlpQDYuEGYXLi1Go5dsEYFXk5QfxVhP6f-b_BymAoKa_COyi0vO_7kh3MTYFPpGFYbJ9aeYINYhv9_cr-dWdU2Koke7dW2w6nyed5_I2hgTdpa3L-6RHM9wdbOv7C1BRBUA56BfbGdSpcAzwNhcR8QS7r4mHN1ywEq-4kHG80LhFfuSNVsUa5WzwhbSpDdTO-ptN7GIxgun4Kh7dzAfuCixfGSo37NBuvaHzDgtc1FmB211Tl0gSWfP4FO2hz8TZjrGLLU4iWQWW-a1LRRI1orXMyxFOXZKhYBXVpG1WrMt66Fgdq5vF8b2U_tWHKxirUaHHbjqGopU-ifsB32u5KFQ7NvQK8";
  
  const gToken = $.getdata(key_token) || "eyJnc24iOiJTMSIsImFsZyI6IlNIQTI1NndpdGhSU0EiLCJ0eXAiOiJKV1QifQ.eyJuYmYiOjE3Njg4NzgzMDksInNvdXJjZUFwcCI6IkdXTSIsInNvdXJjZVR5cGUiOiJJT1MiLCJhcHBJZCI6IkdXTS1BUFAtSU9TLTExMDAwMjAiLCJleHAiOjE3Njk0ODMxMDksImlhdCI6MTc2ODg3ODMwOSwidXNlcklkIjoiVTEzODYwMjEzNTQ2NDU3NDk3NjAiLCJkZXZpY2VJZCI6IjU5QjExMzJCLUM1OTktNDY0Qi04MTI4LTk3NkNBNUEyNDJGQyJ9.dv6u68meIV9NrsPGynu6GQoUFKKx4yofiw989DUbno4sU8ih62+xUV4/czG8/iIA8RJuuCEsKW1hln97aROkptQSwKAGHFdIe50aUzIzS2OsLsKxNc2ZECicLxisB6AHzc4Y9WSpBpEyQ2UmtWw9ZRckSdLov3dpxRLBKzCni2QvqVVl5Za2dvZeP/i5T0G2JmYaw3bJ++MS/gUybK2Eq2R1GZaL5v3ChFFN1DQR+L3GjAu7niPyBiFBCNVvV5I+xP2ggjQIXb3riINzwKiV0bIsOqt0jiRqUM1NNsWo8BcdfUWaXNYcv6ynKknWHvvZyrS+opVGksoeDpEV6uEWaQ==";

  // (2) 组装 Headers
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
    
    // 关键组合：固定签名 + 动态 Token
    "sign": SIGN_CONFIG.sign,
    "TimeStamp": SIGN_CONFIG.timestamp,
    "Authorization": auth,
    "G-Token": gToken
  };

  const request = {
    url: SIGN_CONFIG.url,
    method: "POST", 
    headers: headers,
    body: SIGN_CONFIG.body,
    timeout: 20000 // 20s 超时防止卡死
  };

  $.post(request, (error, response, data) => {
    if (error) {
      console.log(`[Error] ${JSON.stringify(error)}`);
      $.msg($.name, "🚫 网络错误", "无法连接服务器，请检查网络");
    } else {
      try {
        console.log(`[Response] ${data}`);
        const result = JSON.parse(data);
        
        // 成功判定: code 200 或 success 或 message 包含成功
        if (result.code == 200 || result.success || (result.message && result.message.indexOf("成功") > -1)) { 
           const score = result.data ? ` (积分: ${result.data})` : "";
           $.msg($.name, "✅ 签到成功", `结果: ${result.message || "OK"}${score}`);
        } else {
           // 兼容“今日已签到”
           $.msg($.name, "⚠️ 签到反馈", `状态: ${result.message}`);
        }
      } catch (e) {
        $.msg($.name, "⚠️ 解析异常", "服务端数据非 JSON");
      }
    }
    $.done();
  });
}

// -------------------------------------------------------------
// 👇 5. 环境兼容 (Env)
// -------------------------------------------------------------
function Env(t,e){class s{constructor(t){this.env=t}send(t,e="GET"){t="string"==typeof t?{url:t}:t;let s=this.get;return"POST"===e&&(s=this.post),new Promise((e,i)=>{s.call(this,t,(t,s,r)=>{t?i(t):e(s)})})}get(t){return this.send.call(this.env,t)}post(t){return this.send.call(this.env,t,"POST")}}return new class{constructor(t,e){this.name=t,this.http=new s(this),this.data=null,this.dataFile="box.dat",this.logs=[],this.isMute=!1,this.isSurge=!1,this.isQuanX="undefined"!=typeof $task,this.isLoon="undefined"!=typeof $loon,this.isSurge="undefined"!=typeof $httpClient&&!this.isLoon,this.node="undefined"!=typeof module&&!!module.exports,this.log=this.msg,this.start=Date.now()}isNode(){return"undefined"!=typeof module&&!!module.exports}write(t,e){if(this.logAtAll(),this.isNode()){try{let s=require("fs"),i=require("path"),r=i.resolve(this.dataFile),o=i.resolve(process.cwd(),this.dataFile);s.existsSync(r)||s.existsSync(o)||(s.writeFileSync(r,"{}","utf8"),console.log("Create Data File at: "+r)),s.writeFileSync(r,JSON.stringify(t),"utf8")}catch(t){console.log("Write File Error: "+t)}}else if(this.isQuanX)return $prefs.setValueForKey(t,e);else if(this.isSurge)return $persistentStore.write(t,e)}read(t){if(this.logAtAll(),this.isNode()){let e=require("fs"),s=require("path"),i=s.resolve(this.dataFile),r=s.resolve(process.cwd(),this.dataFile);try{return JSON.parse(e.readFileSync(i,"utf8"))}catch(t){return null}}else if(this.isQuanX)return $prefs.valueForKey(t);else if(this.isSurge)return $persistentStore.read(t)}setdata(t,e){let s=!1;if(/^@/.test(e)){const[,i,r]=/^@(.*?)\.(.*?)$/.exec(e),o=this.read(i);if(o){const e=JSON.parse(o);e[r]=t,s=this.write(JSON.stringify(e),i)}}else s=this.write(t,e);return s}getdata(t){let e=null;if(/^@/.test(t)){const[,s,i]=/^@(.*?)\.(.*?)$/.exec(t),r=this.read(s);if(r){const t=JSON.parse(r);e=t[i]}}else e=this.read(t);return e}msg(t,e,s,i){const r=t+" "+e+" "+s,o=[t,e,s];i&&o.push(i),this.isMute||(this.isQuanX?$notify.apply(this,o):this.isSurge&&$notification.post.apply(this,o),console.log(r)),this.logs.push(r)}logAtAll(){this.isNode()}done(t={}){const e=(Date.now()-this.start)/1000;this.msg(this.name,"运行结束",`耗时: ${e} 秒`),this.isNode()&&process.exit(1),this.isQuanX&&$done(t),this.isSurge&&$done(t)}}(t,e)}
