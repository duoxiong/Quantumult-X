/*
长城/哈弗汽车自动签到
By Duoxiong & Gemini
Github: https://github.com/duoxiong/Quantumult-X

[rewrite_local]
^https:\/\/gwm-api\.gwmapp-h\.com\/community-u\/v1\/app\/uc\/sign\/info url script-request-body https://raw.githubusercontent.com/duoxiong/Quantumult-X/refs/heads/main/rewrite/gwm_auto.js

[task_local]
0 9 * * * https://raw.githubusercontent.com/duoxiong/Quantumult-X/refs/heads/main/rewrite/gwm_auto.js, tag=长城汽车签到, img-url=https://raw.githubusercontent.com/Orz-3/mini/master/Color/GWM.png, enabled=true
*/

const $ = new Env("长城汽车签到");
const isGetCookie = typeof $request !== "undefined";

// 存储 Key (确保唯一性)
const key_url = "duoxiong_gwm_url";
const key_headers = "duoxiong_gwm_headers";
const key_body = "duoxiong_gwm_body";

if (isGetCookie) {
  GetCookie();
  $.done();
} else {
  SignIn();
}

function GetCookie() {
  const url = $request.url;
  const headers = JSON.stringify($request.headers);
  const body = $request.body || "";

  // 校验是否包含关键 Token
  if (headers.indexOf("Authorization") > -1 || headers.indexOf("G-Token") > -1) {
    $.setdata(url, key_url);
    $.setdata(headers, key_headers);
    $.setdata(body, key_body);
    
    $.msg($.name, "🎉 获取凭证成功", "请在任务列表中手动测试运行一次");
    console.log(`[获取凭证成功]\nURL: ${url}\nHeaders: ${headers}\nBody: ${body}`);
  } else {
    $.msg($.name, "❌ 获取失败", "未找到 Authorization 或 G-Token 字段");
  }
}

async function SignIn() {
  const url = $.getdata(key_url);
  const headersStr = $.getdata(key_headers);
  const body = $.getdata(key_body);

  if (!url || !headersStr) {
    $.msg($.name, "❌ 签到失败", "未获取 Cookie，请先去 App 签到页面刷新");
    return;
  }

  const headers = JSON.parse(headersStr);
  
  // 构造请求
  const request = {
    url: url,
    method: "POST", 
    headers: headers,
    body: body
  };

  $.post(request, (error, response, data) => {
    if (error) {
      $.msg($.name, "🚫 网络错误", error);
      console.log(error);
    } else {
      try {
        const result = JSON.parse(data);
        console.log(`[响应数据]: ${data}`);
        
        // 判定逻辑: code 200 或 success 为 true
        if (result.code == 200 || result.success || result.msg === "success") { 
           // 提取可能返回的积分信息
           const score = result.data ? ` (积分: ${result.data})` : "";
           $.msg($.name, "✅ 签到成功", `服务端返回: ${result.message || "OK"}${score}`);
        } else {
           $.msg($.name, "⚠️ 签到异常", `代码: ${result.code}, 信息: ${result.message}`);
        }
      } catch (e) {
        console.log(`[解析失败] 数据: ${data}`);
        $.msg($.name, "❌ 解析失败", "返回数据不是合法的 JSON");
      }
    }
    $.done();
  });
}

// --- 基础环境构建函数 (Env) ---
// 兼容 QX, Loon, Surge, Node
function Env(t,e){class s{constructor(t){this.env=t}send(t,e="GET"){t="string"==typeof t?{url:t}:t;let s=this.get;return"POST"===e&&(s=this.post),new Promise((e,i)=>{s.call(this,t,(t,s,r)=>{t?i(t):e(s)})})}get(t){return this.send.call(this.env,t)}post(t){return this.send.call(this.env,t,"POST")}}return new class{constructor(t,e){this.name=t,this.http=new s(this),this.data=null,this.dataFile="box.dat",this.logs=[],this.isMute=!1,this.isSurge=!1,this.isQuanX="undefined"!=typeof $task,this.isLoon="undefined"!=typeof $loon,this.isSurge="undefined"!=typeof $httpClient&&!this.isLoon,this.node="undefined"!=typeof module&&!!module.exports,this.log=this.msg,this.start=Date.now()}isNode(){return"undefined"!=typeof module&&!!module.exports}write(t,e){if(this.logAtAll(),this.isNode()){try{let s=require("fs"),i=require("path"),r=i.resolve(this.dataFile),o=i.resolve(process.cwd(),this.dataFile);s.existsSync(r)||s.existsSync(o)||(s.writeFileSync(r,"{}","utf8"),console.log("Create Data File at: "+r)),s.writeFileSync(r,JSON.stringify(t),"utf8")}catch(t){console.log("Write File Error: "+t)}}else if(this.isQuanX)return $prefs.setValueForKey(t,e);else if(this.isSurge)return $persistentStore.write(t,e)}read(t){if(this.logAtAll(),this.isNode()){let e=require("fs"),s=require("path"),i=s.resolve(this.dataFile),r=s.resolve(process.cwd(),this.dataFile);try{return JSON.parse(e.readFileSync(i,"utf8"))}catch(t){return null}}else if(this.isQuanX)return $prefs.valueForKey(t);else if(this.isSurge)return $persistentStore.read(t)}setdata(t,e){let s=!1;if(/^@/.test(e)){const[,i,r]=/^@(.*?)\.(.*?)$/.exec(e),o=this.read(i);if(o){const e=JSON.parse(o);e[r]=t,s=this.write(JSON.stringify(e),i)}}else s=this.write(t,e);return s}getdata(t){let e=null;if(/^@/.test(t)){const[,s,i]=/^@(.*?)\.(.*?)$/.exec(t),r=this.read(s);if(r){const t=JSON.parse(r);e=t[i]}}else e=this.read(t);return e}msg(t,e,s,i){const r=t+" "+e+" "+s,o=[t,e,s];i&&o.push(i),this.isMute||(this.isQuanX?$notify.apply(this,o):this.isSurge&&$notification.post.apply(this,o),console.log(r)),this.logs.push(r)}logAtAll(){this.isNode()}done(t={}){const e=(Date.now()-this.start)/1000;this.msg(this.name,"运行结束",`耗时: ${e} 秒`),this.isNode()&&process.exit(1),this.isQuanX&&$done(t),this.isSurge&&$done(t)}}(t,e)}
