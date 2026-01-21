/*
长城/哈弗汽车自动签到 (最终稳定版 - 修复假死)
By Duoxiong & Gemini
Github: https://github.com/duoxiong/Quantumult-X

[rewrite_local]
^https:\/\/gwm-api\.gwmapp-h\.com\/community-u\/v1\/app\/uc\/sign\/info url script-request-body https://raw.githubusercontent.com/duoxiong/Quantumult-X/refs/heads/main/rewrite/gwm_auto.js

[task_local]
0 9 * * * https://raw.githubusercontent.com/duoxiong/Quantumult-X/refs/heads/main/rewrite/gwm_auto.js, tag=长城汽车签到, img-url=https://raw.githubusercontent.com/Orz-3/mini/master/Color/GWM.png, enabled=true
*/

const $ = new Env("长城汽车签到");
const isGetCookie = typeof $request !== "undefined";

// 存储 Key
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
  if ($request.method !== "POST") return;

  const url = $request.url;
  const headers = $request.headers;
  const body = $request.body || "";
  
  // 兼容大小写
  const headersStr = JSON.stringify(headers);
  const headersLower = headersStr.toLowerCase();

  // 只要包含 token 或 auth 就抓取
  if (headersLower.indexOf("authorization") > -1 || headersLower.indexOf("g-token") > -1) {
    $.setdata(url, key_url);
    $.setdata(headersStr, key_headers);
    $.setdata(body, key_body);
    
    $.msg($.name, "🎉 抓取成功", "凭证已保存，请去任务列表运行");
    console.log(`[抓取详情] URL: ${url}`);
  }
}

async function SignIn() {
  const url = $.getdata(key_url);
  const headersStr = $.getdata(key_headers);
  const body = $.getdata(key_body);

  if (!url || !headersStr) {
    $.msg($.name, "❌ 无法签到", "未找到 Cookie，请先去 App 签到页下拉刷新！");
    $.done(); 
    return;
  }

  // 解析 Headers
  let headers = JSON.parse(headersStr);
  
  // 🔴 核心修复：删除可能导致死循环/超时的请求头
  // 服务器会自动计算长度，手动保留会导致卡死
  delete headers['Content-Length'];
  delete headers['content-length'];
  delete headers['Connection'];
  delete headers['connection'];
  delete headers['Host'];
  delete headers['host'];

  const request = {
    url: url,
    method: "POST", 
    headers: headers,
    body: body,
    timeout: 10000 // 强制设置 10 秒超时，防止无限转圈
  };

  $.post(request, (error, response, data) => {
    if (error) {
      $.msg($.name, "🚫 网络请求超时", "服务器无响应或网络中断");
      console.log(`[错误详情] ${JSON.stringify(error)}`);
    } else {
      try {
        console.log(`[服务端返回] ${data}`);
        const result = JSON.parse(data);
        if (result.code == 200 || result.success || result.msg === "success") { 
           const score = result.data ? ` (积分: ${result.data})` : "";
           $.msg($.name, "✅ 签到成功", `服务端返回: ${result.message || "OK"}${score}`);
        } else {
           $.msg($.name, "⚠️ 签到失败", `错误: ${result.message}`);
        }
      } catch (e) {
        // 如果返回的不是 JSON (比如 HTML 报错页面)，也要能结束
        $.msg($.name, "⚠️ 响应解析异常", "服务端返回了非 JSON 数据，详见日志");
      }
    }
    $.done(); // 必须调用，否则一直转圈
  });
}

function Env(t,e){class s{constructor(t){this.env=t}send(t,e="GET"){t="string"==typeof t?{url:t}:t;let s=this.get;return"POST"===e&&(s=this.post),new Promise((e,i)=>{s.call(this,t,(t,s,r)=>{t?i(t):e(s)})})}get(t){return this.send.call(this.env,t)}post(t){return this.send.call(this.env,t,"POST")}}return new class{constructor(t,e){this.name=t,this.http=new s(this),this.data=null,this.dataFile="box.dat",this.logs=[],this.isMute=!1,this.isSurge=!1,this.isQuanX="undefined"!=typeof $task,this.isLoon="undefined"!=typeof $loon,this.isSurge="undefined"!=typeof $httpClient&&!this.isLoon,this.node="undefined"!=typeof module&&!!module.exports,this.log=this.msg,this.start=Date.now()}isNode(){return"undefined"!=typeof module&&!!module.exports}write(t,e){if(this.logAtAll(),this.isNode()){try{let s=require("fs"),i=require("path"),r=i.resolve(this.dataFile),o=i.resolve(process.cwd(),this.dataFile);s.existsSync(r)||s.existsSync(o)||(s.writeFileSync(r,"{}","utf8"),console.log("Create Data File at: "+r)),s.writeFileSync(r,JSON.stringify(t),"utf8")}catch(t){console.log("Write File Error: "+t)}}else if(this.isQuanX)return $prefs.setValueForKey(t,e);else if(this.isSurge)return $persistentStore.write(t,e)}read(t){if(this.logAtAll(),this.isNode()){let e=require("fs"),s=require("path"),i=s.resolve(this.dataFile),r=s.resolve(process.cwd(),this.dataFile);try{return JSON.parse(e.readFileSync(i,"utf8"))}catch(t){return null}}else if(this.isQuanX)return $prefs.valueForKey(t);else if(this.isSurge)return $persistentStore.read(t)}setdata(t,e){let s=!1;if(/^@/.test(e)){const[,i,r]=/^@(.*?)\.(.*?)$/.exec(e),o=this.read(i);if(o){const e=JSON.parse(o);e[r]=t,s=this.write(JSON.stringify(e),i)}}else s=this.write(t,e);return s}getdata(t){let e=null;if(/^@/.test(t)){const[,s,i]=/^@(.*?)\.(.*?)$/.exec(t),r=this.read(s);if(r){const t=JSON.parse(r);e=t[i]}}else e=this.read(t);return e}msg(t,e,s,i){const r=t+" "+e+" "+s,o=[t,e,s];i&&o.push(i),this.isMute||(this.isQuanX?$notify.apply(this,o):this.isSurge&&$notification.post.apply(this,o),console.log(r)),this.logs.push(r)}logAtAll(){this.isNode()}done(t={}){const e=(Date.now()-this.start)/1000;this.msg(this.name,"运行结束",`耗时: ${e} 秒`),this.isNode()&&process.exit(1),this.isQuanX&&$done(t),this.isSurge&&$done(t)}}(t,e)}
