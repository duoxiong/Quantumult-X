/*
长城/哈弗汽车自动签到 (免抓取·直连修正版)
By Duoxiong & Gemini
Github: https://github.com/duoxiong/Quantumult-X

[task_local]
# 每天早上 9:00 自动签到 (无需 rewrite 规则)
0 9 * * * https://raw.githubusercontent.com/duoxiong/Quantumult-X/refs/heads/main/rewrite/gwm_auto.js, tag=长城汽车签到, img-url=https://raw.githubusercontent.com/Orz-3/mini/master/Color/GWM.png, enabled=true
*/

const $ = new Env("长城汽车签到");

// -------------------------------------------------------------
// 👇 用户配置区域 (已修正 G-Token 格式)
// -------------------------------------------------------------

const signUrl = "https://gwm-api.gwmapp-h.com/community-u/v1/user/sign/sureNew";

// 请求体 (UserId 已确认)
const signBody = JSON.stringify({
  "userId": "U1386021354645749760"
});

// 请求头 (已清理多余符号)
const signHeaders = {
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
  "sign": "a70f912f8a1e1d0b6b848b60cc52591f3d2a12bea25ec781ad13f9e4192474ce",
  "TimeStamp": "1769043392226",
  "Authorization": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJqd3RfdHlwZSI6MSwiand0VHlwZSI6MSwiYmVhbklkIjoiMzQ1MjQ2MTUzNzY0NzEyNDQ4MCIsImtleSI6ImJlYW4tYXBwLXVzZXIta2V5IiwiZ3dtQnJhbmQiOiJDQ0cwMDEiLCJpc3MiOiJnd3QgU2VydmVyIiwic3NvSWQiOiJVMTM4NjAyMTM1NDY0NTc0OTc2MCIsInJvbGVDb2RlIjoiYWRtaW4iLCJnd21ScyI6IjIiLCJnd0lkIjoiMzQ1MjQ2MTUzNzY0NzEyNDQ4MCIsImlhdCI6MTc2ODg3ODMwOSwiZXhwIjoxNzY5NDgzMTA5LCJjaGFubmVsIjoiNTlCMTEzMkItQzU5OS00NjRCLTgxMjgtOTc2Q0E1QTI0MkZDIn0.AJGlpQDYuEGYXLi1Go5dsEYFXk5QfxVhP6f-b_BymAoKa_COyi0vO_7kh3MTYFPpGFYbJ9aeYINYhv9_cr-dWdU2Koke7dW2w6nyed5_I2hgTdpa3L-6RHM9wdbOv7C1BRBUA56BfbGdSpcAzwNhcR8QS7r4mHN1ywEq-4kHG80LhFfuSNVsUa5WzwhbSpDdTO-ptN7GIxgun4Kh7dzAfuCixfGSo37NBuvaHzDgtc1FmB211Tl0gSWfP4FO2hz8TZjrGLLU4iWQWW-a1LRRI1orXMyxFOXZKhYBXVpG1WrMt66Fgdq5vF8b2U_tWHKxirUaHHbjqGopU-ifsB32u5KFQ7NvQK8",
  "G-Token": "eyJnc24iOiJTMSIsImFsZyI6IlNIQTI1NndpdGhSU0EiLCJ0eXAiOiJKV1QifQ.eyJuYmYiOjE3Njg4NzgzMDksInNvdXJjZUFwcCI6IkdXTSIsInNvdXJjZVR5cGUiOiJJT1MiLCJhcHBJZCI6IkdXTS1BUFAtSU9TLTExMDAwMjAiLCJleHAiOjE3Njk0ODMxMDksImlhdCI6MTc2ODg3ODMwOSwidXNlcklkIjoiVTEzODYwMjEzNTQ2NDU3NDk3NjAiLCJkZXZpY2VJZCI6IjU5QjExMzJCLUM1OTktNDY0Qi04MTI4LTk3NkNBNUEyNDJGQyJ9.dv6u68meIV9NrsPGynu6GQoUFKKx4yofiw989DUbno4sU8ih62+xUV4/czG8/iIA8RJuuCEsKW1hln97aROkptQSwKAGHFdIe50aUzIzS2OsLsKxNc2ZECicLxisB6AHzc4Y9WSpBpEyQ2UmtWw9ZRckSdLov3dpxRLBKzCni2QvqVVl5Za2dvZeP/i5T0G2JmYaw3bJ++MS/gUybK2Eq2R1GZaL5v3ChFFN1DQR+L3GjAu7niPyBiFBCNVvV5I+xP2ggjQIXb3riINzwKiV0bIsOqt0jiRqUM1NNsWo8BcdfUWaXNYcv6ynKknWHvvZyrS+opVGksoeDpEV6uEWaQ==",
  "Accept": "application/json, text/plain, */*",
  "Content-Type": "application/json",
  "Accept-Encoding": "gzip, deflate, br",
  "Sec-Fetch-Mode": "cors"
};

// -------------------------------------------------------------
// 👆 核心数据区域结束
// -------------------------------------------------------------

SignIn();

async function SignIn() {
  $.msg($.name, "🚀 启动签到", "正在发起请求...");

  const request = {
    url: signUrl,
    method: "POST", 
    headers: signHeaders,
    body: signBody,
    timeout: 15000 // 15秒超时
  };

  $.post(request, (error, response, data) => {
    if (error) {
      console.log(`[网络错误] ${JSON.stringify(error)}`);
      $.msg($.name, "🚫 网络请求失败", error.message || "连接超时");
    } else {
      try {
        console.log(`[服务端返回] ${data}`);
        const result = JSON.parse(data);
        
        // 成功判定: 200 或 success 或 message 包含成功
        if (result.code == 200 || result.success || (result.message && result.message.indexOf("成功") > -1)) { 
           const score = result.data ? ` (积分: ${result.data})` : "";
           $.msg($.name, "✅ 签到成功", `结果: ${result.message || "OK"}${score}`);
        } else {
           // 即使返回“今日已签到”也算运行成功
           $.msg($.name, "⚠️ 签到反馈", `状态: ${result.message}`);
        }
      } catch (e) {
        $.msg($.name, "⚠️ 响应解析异常", "服务端数据非 JSON");
      }
    }
    $.done();
  });
}

function Env(t,e){class s{constructor(t){this.env=t}send(t,e="GET"){t="string"==typeof t?{url:t}:t;let s=this.get;return"POST"===e&&(s=this.post),new Promise((e,i)=>{s.call(this,t,(t,s,r)=>{t?i(t):e(s)})})}get(t){return this.send.call(this.env,t)}post(t){return this.send.call(this.env,t,"POST")}}return new class{constructor(t,e){this.name=t,this.http=new s(this),this.data=null,this.dataFile="box.dat",this.logs=[],this.isMute=!1,this.isSurge=!1,this.isQuanX="undefined"!=typeof $task,this.isLoon="undefined"!=typeof $loon,this.isSurge="undefined"!=typeof $httpClient&&!this.isLoon,this.node="undefined"!=typeof module&&!!module.exports,this.log=this.msg,this.start=Date.now()}isNode(){return"undefined"!=typeof module&&!!module.exports}write(t,e){if(this.logAtAll(),this.isNode()){try{let s=require("fs"),i=require("path"),r=i.resolve(this.dataFile),o=i.resolve(process.cwd(),this.dataFile);s.existsSync(r)||s.existsSync(o)||(s.writeFileSync(r,"{}","utf8"),console.log("Create Data File at: "+r)),s.writeFileSync(r,JSON.stringify(t),"utf8")}catch(t){console.log("Write File Error: "+t)}}else if(this.isQuanX)return $prefs.setValueForKey(t,e);else if(this.isSurge)return $persistentStore.write(t,e)}read(t){if(this.logAtAll(),this.isNode()){let e=require("fs"),s=require("path"),i=s.resolve(this.dataFile),r=s.resolve(process.cwd(),this.dataFile);try{return JSON.parse(e.readFileSync(i,"utf8"))}catch(t){return null}}else if(this.isQuanX)return $prefs.valueForKey(t);else if(this.isSurge)return $persistentStore.read(t)}setdata(t,e){let s=!1;if(/^@/.test(e)){const[,i,r]=/^@(.*?)\.(.*?)$/.exec(e),o=this.read(i);if(o){const e=JSON.parse(o);e[r]=t,s=this.write(JSON.stringify(e),i)}}else s=this.write(t,e);return s}getdata(t){let e=null;if(/^@/.test(t)){const[,s,i]=/^@(.*?)\.(.*?)$/.exec(t),r=this.read(s);if(r){const t=JSON.parse(r);e=t[i]}}else e=this.read(t);return e}msg(t,e,s,i){const r=t+" "+e+" "+s,o=[t,e,s];i&&o.push(i),this.isMute||(this.isQuanX?$notify.apply(this,o):this.isSurge&&$notification.post.apply(this,o),console.log(r)),this.logs.push(r)}logAtAll(){this.isNode()}done(t={}){const e=(Date.now()-this.start)/1000;this.msg(this.name,"运行结束",`耗时: ${e} 秒`),this.isNode()&&process.exit(1),this.isQuanX&&$done(t),this.isSurge&&$done(t)}}(t,e)}
