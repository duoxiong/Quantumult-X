/*
长城/哈弗汽车自动签到 (验证增强版)
项目名称: GWM Auto Sign
更新内容: 
1. 拦截 info 接口，进入签到页即可自动抓取 userId、Token 和 Auth。
2. 只要打开签到页面看到“抓取成功”弹窗，即可随时手动运行脚本验证。

[rewrite_local]
# 匹配 info (进入签到页触发) 和 sureNew (点击签到触发)
^https:\/\/gwm-api\.gwmapp-h\.com\/community-u\/v1\/(user\/sign\/sureNew|app\/uc\/sign\/info) url script-request-body https://raw.githubusercontent.com/duoxiong/Quantumult-X/refs/heads/main/rewrite/gwm_sign.js

[mitm]
hostname = gwm-api.gwmapp-h.com
*/

const $ = new Env("长城汽车签到");

// -------------------------------------------------------
// ⚙️ 配置区域
// -------------------------------------------------------
const GWM_SECRET = "8bc742859a7849ec9a924c979afa5a9a"; 
const GWM_APPID = "GWM-H5-110001";
const KEY_AUTH = "duoxiong_gwm_auth";
const KEY_GTOKEN = "duoxiong_gwm_gtoken";
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
// 📡 1. 抓取逻辑 (进入签到页面即触发)
// -------------------------------------------------------
function GetCookie() {
  const url = $request.url;
  const headers = $request.headers;
  let auth, gtoken;

  // 获取 Header 中的关键信息
  for (let key in headers) {
    if (key.toLowerCase() === "authorization") auth = headers[key];
    if (key.toLowerCase() === "g-token") gtoken = headers[key];
  }

  if (auth && gtoken) {
    $.setdata(auth, KEY_AUTH);
    $.setdata(gtoken, KEY_GTOKEN);

    // 重点：尝试从 info 接口提取 userId
    // info 接口通常是 GET，数据在 URL 后面或不需要 body；
    // 如果是 POST 形式加载页面数据，我们直接存下 body 供后续签名使用
    if ($request.body && $request.body.includes("userId")) {
        $.setdata($request.body, KEY_BODY);
        $.msg("长城汽车", "✅ 数据抓取成功", "所有参数已就绪，可随时运行脚本验证。");
    } else if (url.includes("app/uc/sign/info")) {
        // 如果 info 接口不带 body，我们从 headers 存下 token 后，
        // 建议用户手动点一次签到以确保抓取到最准确的 userId 结构
        $.msg("长城汽车", "ℹ️ 凭证已更新", "如签到失败，请在页面手动点一次签到抓取 Body。");
    }
  }
  $done({});
}

// -------------------------------------------------------
// 🚀 2. 签到逻辑 (可随时手动执行验证)
// -------------------------------------------------------
function SignIn() {
  const auth = $.getdata(KEY_AUTH);
  const gToken = $.getdata(KEY_GTOKEN);
  let bodyStr = $.getdata(KEY_BODY);

  if (!auth || !gToken || !bodyStr) {
    $.msg("长城汽车", "🚫 验证失败", "缺少关键参数。请先进入 App 签到页面触发抓取。");
    $done(); return;
  }

  // 这里的 bodyStr 必须和 App 发送的一模一样，否则签名会报错
  const timestamp = new Date().getTime().toString();
  const signStr = GWM_SECRET + bodyStr + timestamp;
  const signature = SHA256(signStr);

  const myRequest = {
    url: SIGN_URL,
    method: "POST",
    headers: {
      "Content-Type": "application/json;charset=utf-8",
      "AppID": GWM_APPID,
      "sourceApp": "GWM",
      "Authorization": auth,
      "G-Token": gToken,
      "sign": signature,
      "TimeStamp": timestamp
    },
    body: bodyStr
  };

  $task.fetch(myRequest).then(response => {
    try {
      const res = JSON.parse(response.body);
      if (res.code == 200 || res.success) {
        $.msg("长城汽车", "✅ 验证/签到成功", `结果: ${res.message || "OK"}`);
      } else {
        $.msg("长城汽车", "⚠️ 验证反馈", `状态: ${res.code}, 信息: ${res.message}`);
        console.log("服务器返回详情: " + response.body);
      }
    } catch (e) {
      $.msg("长城汽车", "❌ 响应异常", "无法解析服务器数据，详情请看日志");
      console.log("响应内容: " + response.body);
    }
    $done();
  }, reason => {
    $.msg("长城汽车", "🚫 网络连接失败", reason.error);
    $done();
  });
}

// -------------------------------------------------------
// 🔐 SHA256 算法 (精简版)
// -------------------------------------------------------
function SHA256(s){var chrsz=8;var hexcase=0;function safe_add(x,y){var lsw=(x&0xFFFF)+(y&0xFFFF);var msw=(x>>16)+(y>>16)+(lsw>>16);return(msw<<16)|(lsw&0xFFFF)}function S(X,n){return(X>>>n)|(X<<(32-n))}function R(X,n){return(X>>>n)}function Ch(x,y,z){return((x&y)^((~x)&z))}function Maj(x,y,z){return((x&y)^(x&z)^(y&z))}function Sigma0256(x){return(S(x,2)^S(x,13)^S(x,22))}function Sigma1256(x){return(S(x,6)^S(x,11)^S(x,25))}function Gamma0256(x){return(S(x,7)^S(x,18)^R(x,3))}function Gamma1256(x){return(S(x,17)^S(x,19)^R(x,10))}function core_sha256(m,l){var K=[0x428A2F98,0x71374491,0xB5C0FBCF,0xE9B5DBA5,0x3956C25B,0x59F111F1,0x923F82A4,0xAB1C5ED5,0xD807AA98,0x12835B01,0x243185BE,0x550C7DC3,0x72BE5D74,0x80DEB1FE,0x9BDC06A7,0xC19BF174,0xE49B69C1,0xEFBE4786,0xFC19DC6,0x240CA1CC,0x2DE92C6F,0x4A7484AA,0x5CB0A9DC,0x76F988DA,0x983E5152,0xA831C66D,0xB00327C8,0xBF597FC7,0xC6E00BF3,0xD5A79147,0x6CA6351,0x14292967,0x27B70A85,0x2E1B2138,0x4D2C6DFC,0x53380D13,0x650A7354,0x766A0ABB,0x81C2C92E,0x92722C85,0xA2BFE8A1,0xA81A664B,0xC24B8B70,0xC76C51A3,0xD192E819,0xD6990624,0xF40E3585,0x106AA070,0x19A4C116,0x1E376C08,0x2748774C,0x34B0BCB5,0x391C0CB3,0x4ED8AA4A,0x5B9CCA4F,0x682E6FF3,0x748F82EE,0x78A5636F,0x84C87814,0x8CC70208,0x90BEFFFA,0xA4506CEB,0xBEF9A3F7,0xC67178F2];var HASH=[0x6A09E667,0xBB67AE85,0x3C6EF372,0xA54FF53A,0x510E527F,0x9B05688C,0x1F83D9AB,0x5BE0CD19];var W=new Array(64);var a,b,c,d,e,f,g,h,i,j;var T1,T2;m[l>>5]|=0x80<<(24-l%32);m[((l+64>>9)<<4)+15]=l;for(var i=0;i<m.length;i+=16){a=HASH[0];b=HASH[1];c=HASH[2];d=HASH[3];e=HASH[4];f=HASH[5];g=HASH[6];h=HASH[7];for(var j=0;j<64;j++){if(j<16)W[j]=m[j+i];else W[j]=safe_add(safe_add(safe_add(Gamma1256(W[j-2]),W[j-7]),Gamma0256(W[j-15])),W[j-16]);T1=safe_add(safe_add(safe_add(safe_add(h,Sigma1256(e)),Ch(e,f,g)),K[j]),W[j]);T2=safe_add(Sigma0256(a),Maj(a,b,c));h=g;g=f;f=e;e=safe_add(d,T1);d=c;c=b;b=a;a=safe_add(T1,T2)}HASH[0]=safe_add(a,HASH[0]);HASH[1]=safe_add(b,HASH[1]);HASH[2]=safe_add(c,HASH[2]);HASH[3]=safe_add(d,HASH[3]);HASH[4]=safe_add(e,HASH[4]);HASH[5]=safe_add(f,HASH[5]);HASH[6]=safe_add(g,HASH[6]);HASH[7]=safe_add(h,HASH[7])}return HASH}function str2binb(str){var bin=Array();var mask=(1<<chrsz)-1;for(var i=0;i<str.length*chrsz;i+=chrsz){bin[i>>5]|=(str.charCodeAt(i/chrsz)&mask)<<(24-i%32)}return bin}function Utf8Encode(string){string=string.replace(/\r\n/g,"\n");var utftext="";for(var n=0;n<string.length;n++){var c=string.charCodeAt(n);if(c<128){utftext+=String.fromCharCode(c)}else if((c>127)&&(c<2048)){utftext+=String.fromCharCode((c>>6)|192);utftext+=String.fromCharCode((c&63)|128)}else{utftext+=String.fromCharCode((c>>12)|224);utftext+=String.fromCharCode(((c>>6)&63)|128);utftext+=String.fromCharCode((c&63)|128)}}return utftext}function binb2hex(binarray){var hex_tab=hexcase?"0123456789ABCDEF":"0123456789abcdef";var str="";for(var i=0;i<binarray.length*4;i++){str+=hex_tab.charAt((binarray[i>>2]>>((3-i%4)*8+4))&0xF)+hex_tab.charAt((binarray[i>>2]>>((3-i%4)*8))&0xF)}return str}s=Utf8Encode(s);return binb2hex(core_sha256(str2binb(s),s.length*chrsz))}

function Env(t){return new class{constructor(t){this.name=t}msg(t,e,s){if("undefined"!=typeof $notify)$notify(t,e,s);console.log(`[${t}] ${e} - ${s}`)}setdata(t,e){return"undefined"!=typeof $prefs?$prefs.setValueForKey(t,e):"undefined"!=typeof $persistentStore?$persistentStore.write(t,e):void 0}getdata(t){return"undefined"!=typeof $prefs?$prefs.valueForKey(t):"undefined"!=typeof $persistentStore?$persistentStore.read(t):void 0}done(){"undefined"!=typeof $done&&$done({})}}(t)}
