/*
脚本名称：长城/哈弗汽车自动签到
活动入口：哈弗智家/长城汽车 APP - 每日签到
签到规则：每日签到获取积分/豆子
使用说明：添加重写规则，进入 App 点击“我的”或“每日签到”页面即可获取 Token 和 userId
更新时间：2026-04-15

================ Surge 配置 ================
[MITM]
hostname = %APPEND% gwm-api.gwmapp-h.com

[Script]
获取长城汽车凭证 = type=http-request, pattern=^https:\/\/gwm-api\.gwmapp-h\.com\/community-u\/v1\/(user\/sign\/sureNew|app\/uc\/sign\/info), requires-body=1, max-size=0, script-path=https://raw.githubusercontent.com/你的用户名/你的仓库/main/scripts/gwm_sign.js

长城汽车签到 = type=cron, cronexp=10 9 * * *, timeout=60, script-path=https://raw.githubusercontent.com/你的用户名/你的仓库/main/scripts/gwm_sign.js, script-update-interval=0

============ Quantumult X 配置 =============
[MITM]
hostname = gwm-api.gwmapp-h.com

[rewrite_local]
^https:\/\/gwm-api\.gwmapp-h\.com\/community-u\/v1\/(user\/sign\/sureNew|app\/uc\/sign\/info) url script-request-body https://raw.githubusercontent.com/你的用户名/你的仓库/main/scripts/gwm_sign.js

[task_local]
10 9 * * * https://raw.githubusercontent.com/duoxiong/Quantumult-X/refs/heads/main/rewrite/gwm_sign.js, tag=长城汽车签到, enabled=true

================ Loon 配置 ================
[MITM]
hostname = gwm-api.gwmapp-h.com

cron "10 9 * * *" script-path=https://raw.githubusercontent.com/你的用户名/你的仓库/main/scripts/gwm_sign.js, tag=长城汽车签到

http-request ^https:\/\/gwm-api\.gwmapp-h\.com\/community-u\/v1\/(user\/sign\/sureNew|app\/uc\/sign\/info) script-path=https://raw.githubusercontent.com/你的用户名/你的仓库/main/scripts/gwm_sign.js, requires-body=true, timeout=10, tag=获取长城汽车凭证

*/

// ---------------------- 基础变量定义 ----------------------
const $ = new Env('长城汽车签到');
const GWM_SECRET = "8bc742859a7849ec9a924c979afa5a9a";
const GWM_APPID = "GWM-H5-110001";
const KEY_AUTH = "duoxiong_gwm_auth";
const KEY_GTOKEN = "duoxiong_gwm_gtoken";
const KEY_BODY = "duoxiong_gwm_body";

// ---------------------- 逻辑入口 ----------------------
!(async () => {
  if (typeof $request !== 'undefined') {
    GetCookie();
  } else {
    await main();
  }
})()
  .catch((e) => $.logErr(e))
  .finally(() => $.done());

// ---------------------- 核心功能实现 ----------------------

async function main() {
  const auth = $.getdata(KEY_AUTH);
  const gToken = $.getdata(KEY_GTOKEN);
  const bodyStr = $.getdata(KEY_BODY);

  if (!auth || !gToken || !bodyStr) {
    $.msg($.name, "🚫 缺少凭证", "请先进入 App 点击“我的”或“签到页”触发抓取。\n提示：若抓取不到，请在 QX 配置 [general] 下加入 dns_exclusion_list = 119.29.29.90");
    return;
  }

  const timestamp = new Date().getTime().toString();
  // 核心签名算法：Secret + Body + Timestamp
  const signStr = GWM_SECRET + bodyStr + timestamp;
  const signature = SHA256(signStr);

  const opts = {
    url: "https://gwm-api.gwmapp-h.com/community-u/v1/user/sign/sureNew",
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

  $.post(opts, (err, resp, data) => {
    try {
      if (err) {
        $.msg($.name, "🚫 网络错误", err);
      } else {
        const res = JSON.parse(data);
        if (res.code == 200 || res.success) {
          $.msg($.name, "✅ 签到成功", `结果: ${res.message || "任务已完成"}`);
        } else if (res.message && res.message.includes("已经签到")) {
          $.msg($.name, "ℹ️ 重复签到", "今日已经签过啦！");
        } else {
          $.msg($.name, "⚠️ 签到失败", res.message);
          console.log(`❌ 失败详情: ${data}`);
        }
      }
    } catch (e) {
      $.msg($.name, "❌ 解析异常", "服务器返回格式错误");
    }
  });
}

function GetCookie() {
  if ($request && $request.headers) {
    const headers = $request.headers;
    let auth, gtoken;

    for (let key in headers) {
      const k = key.toLowerCase();
      if (k === "authorization") auth = headers[key];
      if (k === "g-token") gtoken = headers[key];
    }

    if (auth && gtoken) {
      $.setdata(auth, KEY_AUTH);
      $.setdata(gtoken, KEY_GTOKEN);

      if ($request.body && $request.body.includes("userId")) {
        $.setdata($request.body, KEY_BODY);
        $.msg($.name, "✅ 抓取成功", "登录凭证与用户数据已同步");
      } else {
        console.log("捕获到 Auth，但未发现 userId，请进入签到详情页");
      }
    }
  }
  $.done();
}

// ---------------------- 常用算法 (SHA256) ----------------------
function SHA256(s){var chrsz=8;var hexcase=0;function safe_add(x,y){var lsw=(x&0xFFFF)+(y&0xFFFF);var msw=(x>>16)+(y>>16)+(lsw>>16);return(msw<<16)|(lsw&0xFFFF)}function S(X,n){return(X>>>n)|(X<<(32-n))}function R(X,n){return(X>>>n)}function Ch(x,y,z){return((x&y)^((~x)&z))}function Maj(x,y,z){return((x&y)^(x&z)^(y&z))}function Sigma0256(x){return(S(x,2)^S(x,13)^S(x,22))}function Sigma1256(x){return(S(x,6)^S(x,11)^S(x,25))}function Gamma0256(x){return(S(x,7)^S(x,18)^R(x,3))}function Gamma1256(x){return(S(x,17)^S(x,19)^R(x,10))}function core_sha256(m,l){var K=[0x428A2F98,0x71374491,0xB5C0FBCF,0xE9B5DBA5,0x3956C25B,0x59F111F1,0x923F82A4,0xAB1C5ED5,0xD807AA98,0x12835B01,0x243185BE,0x550C7DC3,0x72BE5D74,0x80DEB1FE,0x9BDC06A7,0xC19BF174,0xE49B69C1,0xEFBE4786,0xFC19DC6,0x240CA1CC,0x2DE92C6F,0x4A7484AA,0x5CB0A9DC,0x76F988DA,0x983E5152,0xA831C66D,0xB00327C8,0xBF597FC7,0xC6E00BF3,0xD5A79147,0x6CA6351,0x14292967,0x27B70A85,0x2E1B2138,0x4D2C6DFC,0x53380D13,0x650A7354,0x766A0ABB,0x81C2C92E,0x92722C85,0xA2BFE8A1,0xA81A664B,0xC24B8B70,0xC76C51A3,0xD192E819,0xD6990624,0xF40E3585,0x106AA070,0x19A4C116,0x1E376C08,0x2748774C,0x34B0BCB5,0x391C0CB3,0x4ED8AA4A,0x5B9CCA4F,0x682E6FF3,0x748F82EE,0x78A5636F,0x84C87814,0x8CC70208,0x90BEFFFA,0xA4506CEB,0xBEF9A3F7,0xC67178F2];var HASH=[0x6A09E667,0xBB67AE85,0x3C6EF372,0xA54FF53A,0x510E527F,0x9B05688C,0x1F83D9AB,0x5BE0CD19];var W=new Array(64);var a,b,c,d,e,f,g,h,i,j;var T1,T2;m[l>>5]|=0x80<<(24-l%32);m[((l+64>>9)<<4)+15]=l;for(var i=0;i<m.length;i+=16){a=HASH[0];b=HASH[1];c=HASH[2];d=HASH[3];e=HASH[4];f=HASH[5];g=HASH[6];h=HASH[7];for(var j=0;j<64;j++){if(j<16)W[j]=m[j+i];else W[j]=safe_add(safe_add(safe_add(Gamma1256(W[j-2]),W[j-7]),Gamma0256(W[j-15])),W[j-16]);T1=safe_add(safe_add(safe_add(safe_add(h,Sigma1256(e)),Ch(e,f,g)),K[j]),W[j]);T2=safe_add(Sigma0256(a),Maj(a,b,c));h=g;g=f;f=e;e=safe_add(d,T1);d=c;c=b;b=a;a=safe_add(T1,T2)}HASH[0]=safe_add(a,HASH[0]);HASH[1]=safe_add(b,HASH[1]);HASH[2]=safe_add(c,HASH[2]);HASH[3]=safe_add(d,HASH[3]);HASH[4]=safe_add(e,HASH[4]);HASH[5]=safe_add(f,HASH[5]);HASH[6]=safe_add(g,HASH[6]);HASH[7]=safe_add(h,HASH[7])}return HASH}function str2binb(str){var bin=Array();var mask=(1<<chrsz)-1;for(var i=0;i<str.length*chrsz;i+=chrsz){bin[i>>5]|=(str.charCodeAt(i/chrsz)&mask)<<(24-i%32)}return bin}function Utf8Encode(string){string=string.replace(/\r\n/g,"\n");var utftext="";for(var n=0;n<string.length;n++){var c=string.charCodeAt(n);if(c<128){utftext+=String.fromCharCode(c)}else if((c>127)&&(c<2048)){utftext+=String.fromCharCode((c>>6)|192);utftext+=String.fromCharCode((c&63)|128)}else{utftext+=String.fromCharCode((c>>12)|224);utftext+=String.fromCharCode(((c>>6)&63)|128);utftext+=String.fromCharCode((c&63)|128)}}return utftext}function binb2hex(binarray){var hex_tab=hexcase?"0123456789ABCDEF":"0123456789abcdef";var str="";for(var i=0;i<binarray.length*4;i++){str+=hex_tab.charAt((binarray[i>>2]>>((3-i%4)*8+4))&0xF)+hex_tab.charAt((binarray[i>>2]>>((3-i%4)*8))&0xF)}return str}s=Utf8Encode(s);return binb2hex(core_sha256(str2binb(s),s.length*chrsz))}

// ---------------------- 跨平台环境类 (Env) ----------------------
function Env(t, e) { class s { constructor(t) { this.env = t } send(t, e = "GET") { t = "string" == typeof t ? { url: t } : t; let s = this.get; return "POST" === e && (s = this.post), new Promise((e, i) => { s.call(this, t, (t, s, r) => { t ? i(t) : e(s) }) }) } get(t) { return this.send.call(this.env, t) } post(t) { return this.send.call(this.env, t, "POST") } } return new class { constructor(t, e) { this.name = t, this.http = new s(this), this.data = null, this.dataFile = "box.dat", this.startTime = (new Date).getTime(), Object.assign(this, e), console.log(`🔔${this.name}, 开始!`) } isNode() { return "undefined" != typeof module && !!module.exports } isQuanX() { return "undefined" != typeof $task } isSurge() { return "undefined" != typeof $httpClient && "undefined" == typeof $loon } isLoon() { return "undefined" != typeof $loon } getdata(t) { let e = this.getval(t); if (/^@/.test(t)) { const [, s, i] = /^@(.*?)\.(.*?)$/.exec(t), r = s ? this.getval(s) : ""; if (r) try { const t = JSON.parse(r); e = t ? t[i] : e } catch (t) { e = "" } } return e } setdata(t, e) { let s = !1; if (/^@/.test(e)) { const [, i, r] = /^@(.*?)\.(.*?)$/.exec(e), o = this.getval(i), a = i ? "null" === o ? null : o || "{}" : "{}"; try { const e = JSON.parse(a); e[r] = t, s = this.setval(JSON.stringify(e), i) } catch (e) { const o = {}; o[r] = t, s = this.setval(JSON.stringify(o), i) } } else s = this.setval(t, e); return s } getval(t) { return this.isSurge() || this.isLoon() ? $persistentStore.read(t) : this.isQuanX() ? $prefs.valueForKey(t) : null } setval(t, e) { return this.isSurge() || this.isLoon() ? $persistentStore.write(t, e) : this.isQuanX() ? $prefs.setValueForKey(t, e) : null } get(t, e = (() => { })) { if (this.isSurge() || this.isLoon()) $httpClient.get(t, (t, s, i) => { !t && s && (s.body = i, s.statusCode = s.status ? s.status : s.statusCode), e(t, s, i) }); else if (this.isQuanX()) $task.fetch(t).then(t => { const { statusCode: s, statusCode: i, headers: r, body: o } = t; e(null, { status: s, statusCode: i, headers: r, body: o }, o) }, t => e(t && t.error || "UndefinedError")) } post(t, e = (() => { })) { if (this.isSurge() || this.isLoon()) $httpClient.post(t, (t, s, i) => { !t && s && (s.body = i, s.statusCode = s.status ? s.status : s.statusCode), e(t, s, i) }); else if (this.isQuanX()) { t.method = "POST"; $task.fetch(t).then(t => { const { statusCode: s, statusCode: i, headers: r, body: o } = t; e(null, { status: s, statusCode: i, headers: r, body: o }, o) }, t => e(t && t.error || "UndefinedError")) } } msg(e = t, s = "", i = "", r) { if (this.isSurge() || this.isLoon()) $notification.post(e, s, i); else if (this.isQuanX()) $notify(e, s, i) } log(...t) { console.log(t.join("\n")) } logErr(t) { console.log(`❗${this.name}, 错误!\n${t}`) } wait(t) { return new Promise(e => setTimeout(e, t)) } done(t = {}) { const e = (new Date).getTime(), s = (e - this.startTime) / 1e3; console.log(`🔔${this.name}, 结束! 🕛 ${s} 秒`), $done(t) } }(t, e) }
