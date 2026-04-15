/*
项目名称: 长城/哈弗汽车自动签到 (12:00 定时版)
更新时间: 2026-04-15
更新内容: 
1. 解决 HTTPDNS 逃逸，全面支持 gapp-api 和 gwm-api 新老域名。
2. 修复签名校验异常，确保 serverSign = appSign。
3. 设定自动执行时间为每天中午 12:00。

---------------------------------------------------------
[Quantumult X 配置指引]

1. [general] 模块添加或合并 (必须屏蔽 HTTPDNS)：
dns_exclusion_list = 119.29.29.90, 119.29.29.88, 119.28.28.28, 182.254.116.116

2. [MITM] 模块添加 (解密所有子域名)：
hostname = *.gwmapp-h.com

3. [rewrite_local] 模块添加 (拦截双域名抓取凭证)：
^https:\/\/(gwm-api|gapp-api)\.gwmapp-h\.com\/community-u\/v1\/(user\/sign\/sureNew|app\/uc\/sign\/info) url script-request-body https://raw.githubusercontent.com/duoxiong/Quantumult-X/refs/heads/main/rewrite/gwm_sign.js

4. [task_local] 模块添加 (每天中午 12 点执行)：
0 12 * * * https://raw.githubusercontent.com/duoxiong/Quantumult-X/refs/heads/main/rewrite/gwm_sign.js, tag=长城汽车签到, img-url=https://raw.githubusercontent.com/Orz-3/mini/master/Color/GWM.png, enabled=true
---------------------------------------------------------
*/

const $ = new Env("长城汽车签到");

// -------------------------------------------------------
// ⚙️ 核心配置
// -------------------------------------------------------
const GWM_SECRET = "8bc742859a7849ec9a924c979afa5a9a"; 
const GWM_APPID = "GWM-H5-110001";
const KEY_AUTH = "duoxiong_gwm_auth";
const KEY_GTOKEN = "duoxiong_gwm_gtoken";
const KEY_BODY = "duoxiong_gwm_body";
// 考虑到可能走 gapp-api 域名，签到接口使用通用路径
const SIGN_PATH = "/community-u/v1/user/sign/sureNew";

// 🚦 逻辑入口
if (typeof $request !== "undefined") {
    GetCookie();
} else {
    SignIn();
}

// -------------------------------------------------------
// 📡 1. 动态抓取逻辑
// -------------------------------------------------------
function GetCookie() {
    const url = $request.url;
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

        // 获取抓取到时的实际域名（gwm-api 或 gapp-api），以便签到时使用正确的域名
        const matchDomain = url.match(/https:\/\/(.*?)\//);
        if (matchDomain && matchDomain[1]) {
            $.setdata(matchDomain[1], "duoxiong_gwm_domain");
        }

        if ($request.body && $request.body.includes("userId")) {
            $.setdata($request.body, KEY_BODY);
            $.msg("长城汽车", "✅ 抓取成功", "登录凭证与用户数据已同步，将在每天12点为您签到。");
            console.log(`✅ [GWM] Body 捕获: ${$request.body}`);
        } else {
            console.log("ℹ️ 捕获到 Auth，但未发现 userId，请进入签到详情页以获取完整数据。");
        }
    }
    $done({});
}

// -------------------------------------------------------
// 🚀 2. 自动签到逻辑
// -------------------------------------------------------
function SignIn() {
    const auth = $.getdata(KEY_AUTH);
    const gToken = $.getdata(KEY_GTOKEN);
    const bodyStr = $.getdata(KEY_BODY);
    // 取出抓取时保存的域名，如果没有则默认使用 gwm-api
    const domain = $.getdata("duoxiong_gwm_domain") || "gwm-api.gwmapp-h.com";

    if (!auth || !gToken || !bodyStr) {
        $.msg("长城汽车", "🚫 数据缺失", "请先在 App 内进入‘每日签到’页面触发抓取。\n如果仍抓不到，请检查 dns_exclusion_list 配置。");
        $done(); return;
    }

    const timestamp = new Date().getTime().toString();
    const signStr = GWM_SECRET + bodyStr + timestamp;
    const signature = SHA256(signStr);

    const myRequest = {
        url: `https://${domain}${SIGN_PATH}`,
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
                $.msg("长城汽车", "✅ 中午好！签到成功", `结果: ${res.message || "任务完成"}`);
            } else if (res.message && res.message.includes("已经签到")) {
                $.msg("长城汽车", "ℹ️ 重复签到", "您今天已经签过啦！");
            } else {
                $.msg("长城汽车", "⚠️ 签到异常", `信息: ${res.message}`);
                console.log(`❌ [GWM] 报错: ${response.body}`);
            }
        } catch (e) {
            $.msg("长城汽车", "❌ 解析失败", "服务器返回格式非 JSON");
        }
        $done();
    }, reason => {
        $.msg("长城汽车", "🚫 网络超时", "请检查网络或代理配置");
        $done();
    });
}

// -------------------------------------------------------
// 🔐 SHA256 算法实现
// -------------------------------------------------------
function SHA256(s){var chrsz=8;var hexcase=0;function safe_add(x,y){var lsw=(x&0xFFFF)+(y&0xFFFF);var msw=(x>>16)+(y>>16)+(lsw>>16);return(msw<<16)|(lsw&0xFFFF)}function S(X,n){return(X>>>n)|(X<<(32-n))}function R(X,n){return(X>>>n)}function Ch(x,y,z){return((x&y)^((~x)&z))}function Maj(x,y,z){return((x&y)^(x&z)^(y&z))}function Sigma0256(x){return(S(x,2)^S(x,13)^S(x,22))}function Sigma1256(x){return(S(x,6)^S(x,11)^S(x,25))}function Gamma0256(x){return(S(x,7)^S(x,18)^R(x,3))}function Gamma1256(x){return(S(x,17)^S(x,19)^R(x,10))}function core_sha256(m,l){var K=[0x428A2F98,0x71374491,0xB5C0FBCF,0xE9B5DBA5,0x3956C25B,0x59F111F1,0x923F82A4,0xAB1C5ED5,0xD807AA98,0x12835B01,0x243185BE,0x550C7DC3,0x72BE5D74,0x80DEB1FE,0x9BDC06A7,0xC19BF174,0xE49B69C1,0xEFBE4786,0xFC19DC6,0x240CA1CC,0x2DE92C6F,0x4A7484AA,0x5CB0A9DC,0x76F988DA,0x983E5152,0xA831C66D,0xB00327C8,0xBF597FC7,0xC6E00BF3,0xD5A79147,0x6CA6351,0x14292967,0x27B70A85,0x2E1B2138,0x4D2C6DFC,0x53380D13,0x650A7354,0x766A0ABB,0x81C2C92E,0x92722C85,0xA2BFE8A1,0xA81A664B,0xC24B8B70,0xC76C51A3,0xD192E819,0xD6990624,0xF40E3585,0x106AA070,0x19A4C116,0x1E376C08,0x2748774C,0x34B0BCB5,0x391C0CB3,0x4ED8AA4A,0x5B9CCA4F,0x682E6FF3,0x748F82EE,0x78A5636F,0x84C87814,0x8CC70208,0x90BEFFFA,0xA4506CEB,0xBEF9A3F7,0xC67178F2];var HASH=[0x6A09E667,0xBB67AE85,0x3C6EF372,0xA54FF53A,0x510E527F,0x9B05688C,0x1F83D9AB,0x5BE0CD19];var W=new Array(64);var a,b,c,d,e,f,g,h,i,j;var T1,T2;m[l>>5]|=0x80<<(24-l%32);m[((l+64>>9)<<4)+15]=l;for(var i=0;i<m.length;i+=16){a=HASH[0];b=HASH[1];c=HASH[2];d=HASH[3];e=HASH[4];f=HASH[5];g=HASH[6];h=HASH[7];for(var j=0;j<64;j++){if(j<16)W[j]=m[j+i];else W[j]=safe_add(safe_add(safe_add(Gamma1256(W[j-2]),W[j-7]),Gamma0256(W[j-15])),W[j-16]);T1=safe_add(safe_add(safe_add(safe_add(h,Sigma1256(e)),Ch(e,f,g)),K[j]),W[j]);T2=safe_add(Sigma0256(a),Maj(a,b,c));h=g;g=f;f=e;e=safe_add(d,T1);d=c;c=b;b=a;a=safe_add(T1,T2)}HASH[0]=safe_add(a,HASH[0]);HASH[1]=safe_add(b,HASH[1]);HASH[2]=safe_add(c,HASH[2]);HASH[3]=safe_add(d,HASH[3]);HASH[4]=safe_add(e,HASH[4]);HASH[5]=safe_add(f,HASH[5]);HASH[6]=safe_add(g,HASH[6]);HASH[7]=safe_add(h,HASH[7])}return HASH}function str2binb(str){var bin=Array();var mask=(1<<chrsz)-1;for(var i=0;i<str.length*chrsz;i+=chrsz){bin[i>>5]|=(str.charCodeAt(i/chrsz)&mask)<<(24-i%32)}return bin}function Utf8Encode(string){string=string.replace(/\r\n/g,"\n");var utftext="";for(var n=0;n<string.length;n++){var c=string.charCodeAt(n);if(c<128){utftext+=String.fromCharCode(c)}else if((c>127)&&(c<2048)){utftext+=String.fromCharCode((c>>6)|192);utftext+=String.fromCharCode((c&63)|128)}else{utftext+=String.fromCharCode((c>>12)|224);utftext+=String.fromCharCode(((c>>6)&63)|128);utftext+=String.fromCharCode((c&63)|128)}}return utftext}function binb2hex(binarray){var hex_tab=hexcase?"0123456789ABCDEF":"0123456789abcdef";var str="";for(var i=0;i<binarray.length*4;i++){str+=hex_tab.charAt((binarray[i>>2]>>((3-i%4)*8+4))&0xF)+hex_tab.charAt((binarray[i>>2]>>((3-i%4)*8))&0xF)}return str}s=Utf8Encode(s);return binb2hex(core_sha256(str2binb(s),s.length*chrsz))}

// -------------------------------------------------------
// ⚙️ Env 环境类 (支持 QuanX/Surge/Loon/Node)
// -------------------------------------------------------
function Env(t){return new class{constructor(t){this.name=t}msg(t,e,s){if("undefined"!=typeof $notify)$notify(t,e,s);console.log(`[${t}] ${e} - ${s}`)}setdata(t,e){return"undefined"!=typeof $prefs?$prefs.setValueForKey(t,e):"undefined"!=typeof $persistentStore?$persistentStore.write(t,e):void 0}getdata(t){return"undefined"!=typeof $prefs?$prefs.valueForKey(t):"undefined"!=typeof $persistentStore?$persistentStore.read(t):void 0}done(){"undefined"!=typeof $done&&$done({})}}(t)}
``` 你可以随时让我修改或删除预设操作。预设操作准备就绪时，“近期对话”中的本次对话旁边会出现一个小圆点。
http://googleusercontent.com/task_confirmation_content/0
