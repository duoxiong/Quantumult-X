/*
长城/哈弗汽车自动签到 (最终完美适配版)
By Duoxiong & Gemini
Github: https://github.com/duoxiong/Quantumult-X

[rewrite_local]
^https:\/\/gwm-api\.gwmapp-h\.com\/community-u\/v1\/user\/sign\/sureNew url script-request-body https://raw.githubusercontent.com/duoxiong/Quantumult-X/refs/heads/main/rewrite/gwm_auto.js

[task_local]
0 9 * * * https://raw.githubusercontent.com/duoxiong/Quantumult-X/refs/heads/main/rewrite/gwm_auto.js, tag=长城汽车签到, img-url=https://raw.githubusercontent.com/Orz-3/mini/master/Color/GWM.png, enabled=true
*/

const $ = new Env("长城汽车签到");
const isGetCookie = typeof $request !== "undefined";

// 使用全新的 Key，避免读取到旧的错误数据
const key_url = "duoxiong_gwm_v2_url";
const key_headers = "duoxiong_gwm_v2_headers";
const key_body = "duoxiong_gwm_v2_body";

if (isGetCookie) {
  GetCookie();
  $.done();
} else {
  SignIn();
}

function GetCookie() {
  // 只拦截 POST 请求
  if ($request.method !== "POST") return;

  const url = $request.url;
  const headers = $request.headers;
  const body = $request.body || "";
  
  const headersStr = JSON.stringify(headers);
  const headersLower = headersStr.toLowerCase();

  // 只要包含 token 或 auth 就抓取
  if (headersLower.indexOf("authorization") > -1 || headersLower.indexOf("g-token") > -1) {
    $.setdata(url, key_url);
    $.setdata(headersStr, key_headers);
    $.setdata(body, key_body);
    
    // 弹窗提示
    $.msg($.name, "🎉 抓取成功", "已捕获真实签到数据 (sureNew)，脚本准备就绪！");
    console.log(`[抓取详情] URL: ${url}`);
    console.log(`[抓取Body] ${body}`);
  }
}

async function SignIn() {
  const url = $.getdata(key_url);
  const headersStr = $.getdata(key_headers);
  const body = $.getdata(key_body);

  if (!url || !headersStr) {
    $.msg($.name, "❌ 无法签到", "数据为空，请去App点击'签到'按钮来触发抓取");
    $.done(); 
    return;
  }

  let headers = JSON.parse(headersStr);
  
  // 核心防卡死：删除多余的头
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
    timeout: 10000 // 10秒超时
  };

  $.post(request, (error, response, data) => {
    if (error) {
      console.log(`[网络错误] ${JSON.stringify(error)}`);
      $.msg($.name, "🚫 网络异常", "请求发送失败");
    } else {
      try {
        console.log(`[服务端返回] ${data}`);
        const result = JSON.parse(data);
        // code 200 或者 success 为 true，或者 message 包含成功
        if (result.code == 200 || result.success || (result.message && result.message.indexOf("成功") > -1)) { 
           const score = result.data ? ` (积分: ${result.data})` : "";
           $.msg($.name, "✅ 签到成功", `结果: ${result.message || "OK"}${score}`);
        } else {
           // 如果返回 "今日已签到" 也算成功
           $.msg($.name, "⚠️ 签到反馈", `状态: ${result.message}`);
        }
      } catch (e) {
        $.msg($.name, "⚠️ 数据解析异常", "服务端返回了非 JSON 数据");
      }
    }
    $.done();
  });
}

function Env(t,e){class s{constructor(t){this.env=t}send(t,e="GET"){t="string"==typeof t?{url:t}:t;let s=this.get;return"POST"===e&&(s=this.post),new Promise((e,i)=>{s.call(this,t,(t,s,r)=>{t?i(t):e(s)})})}get(t){return this.send.call(this.env,t)}post(t){return this.send.call(this.env,t,"POST")}}return new class{constructor(t,e){this.name=t,this.http=new s(this),this.data=null,this.dataFile="box.dat",this.logs=[],this.isMute=!1,this.isSurge=!1,this.isQuanX="undefined"!=typeof $task,this.isLoon="undefined"!=typeof $loon,this.isSurge="undefined"!=typeof $httpClient&&!this.isLoon,this.node="undefined"!=typeof module&&!!module.exports,this.log=this.msg,this.start=Date.now()}isNode(){return"undefined"!=typeof module&&!!module.exports}write(t,e){if(this.logAtAll(),this.isNode()){try{let s=require("fs"),i=require("path"),r=i.resolve(this.dataFile),o=i.resolve(process.cwd(),this.dataFile);s.existsSync(r)||s.existsSync(o)||(s.writeFileSync(r,"{}","utf8"),console.log("Create Data File at: "+r)),s.writeFileSync(r,JSON.stringify(t),"utf8")}catch(t){console.log("Write File Error: "+t)}}else if(this.isQuanX)return $prefs.setValueForKey(t,e);else if(this.isSurge)return $persistentStore.write(t,e)}read(t){if(this.logAtAll(),this.isNode()){let e=require("fs"),s=require("path"),i=s.resolve(this.dataFile),r=s.resolve(process.cwd(),this.dataFile);try{return JSON.parse(e.readFileSync(i,"utf8"))}catch(t){return null}}else if(this.isQuanX)return $prefs.valueForKey(t);else if(this.isSurge)return $persistentStore.read(t)}setdata(t,e){let s=!1;if(/^@/.test(e)){const[,i,r]=/^@(.*?)\.(.*?)$/.exec(e),o=this.read(i);if(o){const e=JSON.parse(o);e[r]=t,s=this.write(JSON.stringify(e),i)}}else s=this.write(t,e);return s}getdata(t){let e=null;if(/^@/.test(t)){const[,s,i]=/^@(.*?)\.(.*?)$/.exec(t),r=this.read(s);if(r){const t=JSON.parse(r);e=t[i]}}else e=this.read(t);return e}msg(t,e,s,i){const r=t+" "+e+" "+s,o=[t,e,s];i&&o.push(i),this.isMute||(this.isQuanX?$notify.apply(this,o):this.isSurge&&$notification.post.apply(this,o),console.log(r)),this.logs.push(r)}logAtAll(){this.isNode()}done(t={}){const e=(Date.now()-this.start)/1000;this.msg(this.name,"运行结束",`耗时: ${e} 秒`),this.isNode()&&process.exit(1),this.isQuanX&&$done(t),this.isSurge&&$done(t)}}(t,e)}
