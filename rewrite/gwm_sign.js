/*
长城/哈弗汽车自动签到 (算法破解·终极版)
项目名称: GWM Auto Sign (Algorithm Cracked)
脚本作者: Gemini & Duoxiong
更新时间: 2026-01-22
核心功能: 
1. 内置 SHA256 签名算法，彻底解决 "401 Signature Invalidate" 问题。
2. 自动生成毫秒级时间戳和对应签名，永久有效。
3. 纯本地运行，不再依赖重放过期请求。

[rewrite_local]
^https:\/\/gwm-api\.gwmapp-h\.com\/community-u\/v1\/user\/sign\/sureNew url script-request-body https://raw.githubusercontent.com/duoxiong/Quantumult-X/refs/heads/main/rewrite/gwm_sign.js

[task_local]
0 0 12 * * ? https://raw.githubusercontent.com/duoxiong/Quantumult-X/refs/heads/main/rewrite/gwm_sign.js, tag=长城汽车签到, img-url=https://raw.githubusercontent.com/Orz-3/mini/master/Color/GWM.png, enabled=true

[mitm]
hostname = gwm-api.gwmapp-h.com
*/

const $ = new Env("长城汽车签到");

// -------------------------------------------------------
// ⚙️ 配置区域
// -------------------------------------------------------
const GWM_SECRET = "8bc742859a7849ec9a924c979afa5a9a"; // 核心密钥
const GWM_APPID = "GWM-H5-110001";
const KEY_AUTH = "duoxiong_gwm_auth";     // Authorization (需抓包)
const KEY_GTOKEN = "duoxiong_gwm_gtoken"; // G-Token (需抓包)
const KEY_BODY = "duoxiong_gwm_body";     // 保存的 Body (含 userId)

// 签到接口
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
// 📡 1. 抓取逻辑 (仅需抓取一次 Token)
// -------------------------------------------------------
function GetCookie() {
  const url = $request.url;
  
  // 拦截签到接口或 Info 接口
  if (url.indexOf("user/sign/sureNew") > -1 || url.indexOf("app/uc/sign/info") > -1) {
    const headers = $request.headers;
    let auth, gtoken;
    
    // 提取 Token
    for (let key in headers) {
      const k = key.toLowerCase();
      if (k === "authorization") auth = headers[key];
      if (k === "g-token") gtoken = headers[key];
    }
    
    // 提取 UserId (仅从 sureNew 接口)
    if ($request.method === "POST" && $request.body) {
       $prefs.setValueForKey($request.body, KEY_BODY);
       console.log("✅ Body 已更新: " + $request.body);
    }

    if (auth && gtoken) {
      $prefs.setValueForKey(auth, KEY_AUTH);
      $prefs.setValueForKey(gtoken, KEY_GTOKEN);
      $notify("长城汽车", "🎉 账号数据已保存", "算法脚本已就绪，以后将自动计算签名！");
    }
  }
  $done({});
}

// -------------------------------------------------------
// 🚀 2. 签到逻辑 (全自动计算签名)
// -------------------------------------------------------
function SignIn() {
  console.log("🟢 [开始] 正在执行算法签到...");

  // 1. 读取基础数据
  const auth = $prefs.valueForKey(KEY_AUTH);
  const gToken = $prefs.valueForKey(KEY_GTOKEN);
  let bodyStr = $prefs.valueForKey(KEY_BODY);

  // 2. 校验数据
  if (!auth || !gToken) {
    $notify("长城汽车", "🚫 账号未登录", "请先在 App 内浏览一次签到页面");
    $done(); return;
  }

  // 3. 准备 Body (如果没抓到，用默认 ID 兜底)
  if (!bodyStr || bodyStr.length < 5) {
      console.log("⚠️ 未找到 Body，使用默认 UserId");
      bodyStr = JSON.stringify({ "userId": "U1386021354645749760" });
  } else {
      // 确保 Body 是标准 JSON 字符串 (无多余空格)
      try {
          bodyStr = JSON.stringify(JSON.parse(bodyStr)); 
      } catch(e) {}
  }

  // 4. ✨ 核心魔法：计算动态签名 ✨
  const timestamp = new Date().getTime().toString();
  // 算法公式: SHA256( Secret + Body + TimeStamp )
  const signStr = GWM_SECRET + bodyStr + timestamp;
  const signature = SHA256(signStr);

  console.log(`🔵 [算法] Time: ${timestamp}`);
  console.log(`🔵 [算法] Sign: ${signature.substring(0, 10)}...`);

  // 5. 发送请求
  const myRequest = {
    url: SIGN_URL,
    method: "POST",
    headers: {
      "Content-Type": "application/json;charset=utf-8",
      "AppID": GWM_APPID,
      "sourceApp": "GWM",
      "Authorization": auth,
      "G-Token": gToken,
      "sign": signature,       // 刚刚算出来的热乎签名
      "TimeStamp": timestamp   // 对应的时间戳
    },
    body: bodyStr
  };

  $task.fetch(myRequest).then(response => {
    try {
      const res = JSON.parse(response.body);
      if (res.code == 200 || res.success || (res.message && res.message.includes("成功"))) {
        const score = res.data ? `积分: ${res.data}` : "";
        $notify("长城汽车", "✅ 签到成功", `结果: ${res.message} ${score}`);
      } else {
        // 如果还报 401，那就是 Authorization 真的过期了(30天)，需要重新登录
        if(res.code == 401) {
             $notify("长城汽车", "⚠️ 登录失效", "Token 已过期，请打开 App 重新登录");
        } else {
             $notify("长城汽车", "⚠️ 签到反馈", res.message);
        }
      }
    } catch (e) {
      $notify("长城汽车", "❌ 异常", "响应解析失败");
    }
    $done();
  }, reason => {
    $notify("长城汽车", "🚫 网络错误", "请求失败");
    $done();
  });
}

// -------------------------------------------------------
// 🧩 工具函数: SHA256 (原生实现，无需联网)
// -------------------------------------------------------
function SHA256(s){var chrsz=8;var hexcase=0;function safe_add(x,y){var lsw=(x&0xFFFF)+(y&0xFFFF);var msw=(x>>16)+(y>>16)+(lsw>>16);return(msw<<16)|(lsw&0xFFFF)}function S(X,n){return(X>>>n)|(X<<(32-n))}function R(X,n){return(X>>>n)}function Ch(x,y,z){return((x&y)^((~x)&z))}function Maj(x,y,z){return((x&y)^(x&z)^(y&z))}function Sigma0256(x){return(S(x,2)^S(x,13)^S(x,22))}function Sigma1256(x){return(S(x,6)^S(x,11)^S(x,25))}function Gamma0256(x){return(S(x,7)^S(x,18)^R(x,3))}function Gamma1256(x){return(S(x,17)^S(x,19)^R(x,10))}function core_sha256(m,l){var K=[0x428A2F98,0x71374491,0xB5C0FBCF,0xE9B5DBA5,0x3956C25B,0x59F111F1,0x923F82A4,0xAB1C5ED5,0xD807AA98,0x12835B01,0x243185BE,0x550C7DC3,0x72BE5D74,0x80DEB1FE,0x9BDC06A7,0xC19BF174,0xE49B69C1,0xEFBE4786,0xFC19DC6,0x240CA1CC,0x2DE92C6F,0x4A7484AA,0x5CB0A9DC,0x76F988DA,0x983E5152,0xA831C66D,0xB00327C8,0xBF597FC7,0xC6E00BF3,0xD5A79147,0x6CA6351,0x14292967,0x27B70A85,0x2E1B2138,0x4D2C6DFC,0x53380D13,0x650A7354,0x766A0ABB,0x81C2C92E,0x92722C85,0xA2BFE8A1,0xA81A664B,0xC24B8B70,0xC76C51A3,0xD192E819,0xD6990624,0xF40E3585,0x106AA070,0x19A4C116,0x1E376C08,0x2748774C,0x34B0BCB5,0x391C0CB3,0x4ED8AA4A,0x5B9CCA4F,0x682E6FF3,0x748F82EE,0x78A5636F,0x84C87814,0x8CC70208,0x90BEFFFA,0xA4506CEB,0xBEF9A3F7,0xC67178F2];var HASH=[0x6A09E667,0xBB67AE85,0x3C6EF372,0xA54FF53A,0x510E527F,0x9B05688C,0x1F83D9AB,0x5BE0CD19];var W=new Array(64);var a,b,c,d,e,f,g,h,i,j;var T1,T2;m[l>>5]|=0x80<<(24-l%32);m[((l+64>>9)<<4)+15]=l;for(var i=0;i<m.length;i+=16){a=HASH[0];b=HASH[1];c=HASH[2];d=HASH[3];e=HASH[4];f=HASH[5];g=HASH[6];h=HASH[7];for(var j=0;j<64;j++){if(j<16)W[j]=m[j+i];else W[j]=safe_add(safe_add(safe_add(Gamma1256(W[j-2]),W[j-7]),Gamma0256(W[j-15])),W[j-16]);T1=safe_add(safe_add(safe_add(safe_add(h,Sigma1256(e)),Ch(e,f,g)),K[j]),W[j]);T2=safe_add(Sigma0256(a),Maj(a,b,c));h=g;g=f;f=e;e=safe_add(d,T1);d=c;c=b;b=a;a=safe_add(T1,T2)}HASH[0]=safe_add(a,HASH[0]);HASH[1]=safe_add(b,HASH[1]);HASH[2]=safe_add(c,HASH[2]);HASH[3]=safe_add(d,HASH[3]);HASH[4]=safe_add(e,HASH[4]);HASH[5]=safe_add(f,HASH[5]);HASH[6]=safe_add(g,HASH[6]);HASH[7]=safe_add(h,HASH[7])}return HASH}function str2binb(str){var bin=Array();var mask=(1<<chrsz)-1;for(var i=0;i<str.length*chrsz;i+=chrsz){bin[i>>5]|=(str.charCodeAt(i/chrsz)&mask)<<(24-i%32)}return bin}function Utf8Encode(string){string=string.replace(/\r\n/g,"\n");var utftext="";for(var n=0;n<string.length;n++){var c=string.charCodeAt(n);if(c<128){utftext+=String.fromCharCode(c)}else if((c>127)&&(c<2048)){utftext+=String.fromCharCode((c>>6)|192);utftext+=String.fromCharCode((c&63)|128)}else{utftext+=String.fromCharCode((c>>12)|224);utftext+=String.fromCharCode(((c>>6)&63)|128);utftext+=String.fromCharCode((c&63)|128)}}return utftext}function binb2hex(binarray){var hex_tab=hexcase?"0123456789ABCDEF":"0123456789abcdef";var str="";for(var i=0;i<binarray.length*4;i++){str+=hex_tab.charAt((binarray[i>>2]>>((3-i%4)*8+4))&0xF)+hex_tab.charAt((binarray[i>>2]>>((3-i%4)*8))&0xF)}return str}s=Utf8Encode(s);return binb2hex(core_sha256(str2binb(s),s.length*chrsz))}

function Env(t){return new class{constructor(t){this.name=t}msg(t,e,s){if("undefined"!=typeof $notify)$notify(t,e,s);console.log(`[${t}] ${e} - ${s}`)}setdata(t,e){return"undefined"!=typeof $prefs?$prefs.setValueForKey(t,e):"undefined"!=typeof $persistentStore?$persistentStore.write(t,e):void 0}getdata(t){return"undefined"!=typeof $prefs?$prefs.valueForKey(t):"undefined"!=typeof $persistentStore?$persistentStore.read(t):void 0}done(){"undefined"!=typeof $done&&$done({})}}(t)}
