/*
脚本名称：长城/坦克汽车自动签到
脚本作者：GWM_User
更新时间：2026-01-20
脚本功能：
1. 自动抓取长城系APP（长城汽车、坦克TANK）的登录 Token。
2. 每日自动签到获取积分。

================ Quantumult X 配置 ================

[MITM]
hostname = app-api.gwm.com.cn, gateway.gwm.com.cn

[rewrite_local]
# 抓取 Token (打开 APP 点击"我的"页面触发)
^https:\/\/(app-api|gateway)\.gwm\.com\.cn\/.*\/user\/info url script-request-header https://raw.githubusercontent.com/duoxiong/Quantumult-X/refs/heads/main/rewrite/gwm_auto.js

[task_local]
# 每日 09:00 自动签到
0 9 * * * https://raw.githubusercontent.com/duoxiong/Quantumult-X/refs/heads/main/rewrite/gwm_auto.js, tag=长城汽车签到, enabled=true

*/

const $ = new Env("长城汽车签到");

// ---------------- 配置区域 ----------------
const GWM_TOKEN_KEY = 'gwm_token'; // 缓存 Token 的 Key
const GWM_HOST = 'app-api.gwm.com.cn'; // 主机域名 (坦克/长城通用)

// 签到接口配置 (如有变动，仅修改此处)
const API_URL = {
    sign: '/app/v1/activity/sign_in', // 签到接口
    info: '/app/v1/user/info'         // 用于抓包匹配的接口
};
// -----------------------------------------

let gwm_token = ($.isNode() ? process.env[GWM_TOKEN_KEY] : $.getdata(GWM_TOKEN_KEY)) || '';
let tokenArr = [];

!(async () => {
    // 场景 1：重写请求触发（自动抓取 Token）
    if (typeof $request !== 'undefined') {
        GetToken();
        return;
    }

    // 场景 2：定时任务触发（执行签到）
    if (!await checkEnv()) return;
    
    console.log(`\n🚗 ${$.name} 开始执行...`);
    for (let i = 0; i < tokenArr.length; i++) {
        let token = tokenArr[i];
        console.log(`\n👤 开始执行第 [${i + 1}] 个账号`);
        await signIn(token);
        await $.wait(2000); // 防风控延迟
    }
})()
.catch((e) => $.logErr(e))
.finally(() => $.done());


// 📥 [核心逻辑] 抓取 Token
function GetToken() {
    if ($request && $request.headers) {
        const headers = $request.headers;
        // 长城系 APP Token 通常在 Authorization 或 token 字段
        const tokenVal = headers['Authorization'] || headers['token'] || headers['Access-Token'] || headers['authorization'];
        
        if (tokenVal) {
            // 简单去重：如果新 Token 与旧 Token 不同，则更新
            const oldToken = $.getdata(GWM_TOKEN_KEY);
            if (oldToken !== tokenVal) {
                $.setdata(tokenVal, GWM_TOKEN_KEY);
                $.msg($.name, "🎉 抓取成功", "Token 已自动更新，无需手动填写");
                console.log(`✅ Token 获取成功: ${tokenVal}`);
            }
        } else {
            console.log(`❌ 未在请求头中找到 Token，请检查 Header 字段`);
        }
    }
}


// 📝 [核心逻辑] 执行签到
async function signIn(token) {
    const url = {
        url: `https://${GWM_HOST}${API_URL.sign}`,
        headers: {
            'Host': GWM_HOST,
            'Content-Type': 'application/json;charset=utf-8',
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
            'Authorization': token, // 注入 Token
            'token': token          // 兼容部分旧接口
        },
        body: JSON.stringify({}) // 签到通常为空 Body 或简单的 activityId
    };

    let result = await httpRequest(url, 'POST');
    
    // 结果判定逻辑
    if (result) {
        console.log(`服务端返回: ${JSON.stringify(result)}`);
        
        // 成功判定：code 200 或 success true
        if (result.code == 200 || result.success == true || result.code == '0') {
            const msg = result.data || result.message || "签到成功";
            $.msg($.name, "✅ 签到成功", `获得奖励: ${msg}`);
        } 
        // 重复签到判定
        else if (result.code == 1001 || JSON.stringify(result).includes("重复")) {
             $.msg($.name, "⚠️ 今日已签", "请勿重复签到");
        }
        // Token 失效判定
        else if (result.code == 401 || result.code == 403) {
            $.msg($.name, "❌ 签到失败", "Token 已失效，请重新打开 APP 获取");
        } 
        else {
            $.msg($.name, "❌ 签到失败", `错误代码: ${result.code}, 消息: ${result.message}`);
        }
    } else {
        $.msg($.name, "❌ 网络错误", "无法连接到服务器");
    }
}


// 🛠 环境检查
async function checkEnv() {
    if (gwm_token) {
        // 支持多账号（以 @ 分割）
        tokenArr = gwm_token.split('@');
        return true;
    } else {
        $.msg($.name, "🚫 无法执行", "请先打开 APP -> 点击'我的' 获取 Token");
        console.log("❌ 未找到 Token，请检查重写规则是否生效");
        return false;
    }
}


// 🌐 HTTP 请求封装
function httpRequest(options, method = 'GET') {
    return new Promise((resolve) => {
        $[method.toLowerCase()](options, (err, resp, data) => {
            try {
                if (err) console.log(`❌ 请求失败: ${JSON.stringify(err)}`);
                if (data) data = JSON.parse(data);
            } catch (e) {
                // 解析失败则返回原数据
            } finally {
                resolve(data);
            }
        });
    });
}

// ==============================================================================
// 🤖 兼容层核心代码 (Quantumult X / Loon / Surge / Node.js)
// ==============================================================================
// prettier-ignore
function Env(t,e){class s{constructor(t){this.env=t}send(t,e="GET"){t="string"==typeof t?{url:t}:t;let s=this.get;return"POST"===e&&(s=this.post),new Promise((e,i)=>{s.call(this,t,(t,s,r)=>{t?i(t):e(s)})})}get(t){return this.send.call(this.env,t)}post(t){return this.send.call(this.env,t,"POST")}}return new class{constructor(t,e){this.name=t,this.http=new s(this),this.data=null,this.dataFile="box.dat",this.logs=[],this.isMute=!1,this.isNeedRewrite=!1,this.logSeparator="\n",this.encoding="utf-8",this.startTime=(new Date).getTime(),Object.assign(this,e),this.log("",`\ud83d\udd14${this.name}, \u5f00\u59cb!`)}isNode(){return"undefined"!=typeof module&&!!module.exports}isQuanX(){return"undefined"!=typeof $task}isSurge(){return"undefined"!=typeof $httpClient&&"undefined"==typeof $loon}isLoon(){return"undefined"!=typeof $loon}isShadowrocket(){return"undefined"!=typeof $rocket}isStash(){return"undefined"!=typeof $environment&&$environment["stash-version"]}toObj(t,e=null){try{return JSON.parse(t)}catch{return e}}toStr(t,e=null){try{return JSON.stringify(t)}catch{return e}}getjson(t,e){let s=e;const i=this.getdata(t);if(i)try{s=JSON.parse(this.getdata(t))}catch{}return s}setjson(t,e){try{return this.setdata(JSON.stringify(t),e)}catch{return!1}}getScript(t){return new Promise(e=>{this.get({url:t},(t,s,i)=>e(i))})}runScript(t,e){return new Promise(s=>{let i=this.getdata("@chavy_boxjs_userCfgs.httpapi");i=i?i.replace(/\n/g,"").trim():i;let r=this.getdata("@chavy_boxjs_userCfgs.httpapi_timeout");r=r?1*r:20,r=e&&e.timeout?e.timeout:r;const[o,a]=i.split("@"),n={url:`http://${a}/v1/scripting/evaluate`,body:{script_text:t,mock_type:"cron",timeout:r},headers:{"X-Key":o,Accept:"*/*"}};this.post(n,(t,e,i)=>s(i))}).catch(t=>this.logErr(t))}loaddata(){if(!this.isNode())return{};{this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),e=this.path.resolve(process.cwd(),this.dataFile),s=this.fs.existsSync(t),i=!s&&this.fs.existsSync(e);if(!s&&!i)return{};{const i=s?t:e;try{return JSON.parse(this.fs.readFileSync(i))}catch(t){return{}}}}};writedata(){if(this.isNode()){this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),e=this.path.resolve(process.cwd(),this.dataFile),s=this.fs.existsSync(t),i=!s&&this.fs.existsSync(e),r=JSON.stringify(this.data);s?this.fs.writeFileSync(t,r):i?this.fs.writeFileSync(e,r):this.fs.writeFileSync(t,r)}}lodash_get(t,e,s){const i=e.替换(/\[(\d+)\]/g，".$1").split(".");let r=t;for(const t of i)if(r=Object(r)[t],void 0===r)return s;return r}lodash_set(t,e,s){return Object(t)!==t?t:(Array.isArray(e)||(e=e.toString().match(/[^.[\]]+/g)||[]),e.slice(0,-1).reduce((t,s,i)=>Object(t[s])===t[s]?t[s]:t[s]=Math.abs(e[i+1])>>0==+e[i+1]?[]:{},t)[e[e.length-1]]=s,t)}getdata(t){let e=this.getval(t);if(/^@/.test(t)){const[,s,i]=/^@(.*?)\.(.*?)$/.exec(t),r=s?this.getval(s):"";if(r)try{const t=JSON.parse(r);e=t?this.lodash_get(t,i,""):e}catch(t){e=""}}return e}setdata(t,e){let s=!1;if(/^@/.test(e)){const[,i,r]=/^@(.*?)\.(.*?)$/.exec(e),o=this.getval(i),a=i?"null"===o?null:o||"{}":"{}";try{const e=JSON.parse(a);this.lodash_set(e,r,t),s=this.setval(JSON.stringify(e),i)}catch(e){const o={};this.lodash_set(o,r,t),s=this.setval(JSON.stringify(o), i)}}else s=this.setval(t,e);return s}getval(t){return this.isSurge()||this.isLoon()?$persistentStore.read(t):this.isQuanX()?$prefs.valueForKey(t):this.isNode()?(this.data=this.loaddata(),this.data[t]):this.data&&this.data[t]||null}setval(t,e){return this.isSurge()||this.isLoon()?$persistentStore.write(t,e):this.isQuanX()?$prefs.setValueForKey(t,e):this.isNode()?(this.data=this.loaddata(),this.data[e]=t,this.writedata(),!0):this.data&&this.data[e]||null}initGotEnv(t){this.got=this.got?this.got:require("got"),this.cktough=this.cktough?this.cktough:require("tough-cookie"),this.ckjar=this.ckjar?this.ckjar:new this.cktough.CookieJar,t&&(t.headers=t.headers?t.headers:{},void 0===t.headers.Cookie&&void 0===t.cookieJar&&(t.cookieJar=this.ckjar))}get(t,e=(()=>{
})){if(t.headers&&(delete t.headers["Content-Type"],delete t.headers["Content-Length"]),this.isSurge()||this.isLoon())this.isSurge()&&this.isNeedRewrite&&(t.headers=t.headers||{},Object.assign(t.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient.get(t,(t,s,i)=>{!t&&s&&(s.body=i,s.statusCode=s.status?s.status:s.statusCode,s.status=s.statusCode),e(t,s,i)});else if(this.isQuanX())this.isNeedRewrite&&(t.opts=t.opts||{},Object.assign(t.opts,{hints:!1})),$task.fetch(t).键，然后(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>e(t&&t.error||"UndefinedError"));else if(this.isNode()){let s=require("iconv-lite");this.initGotEnv(t),this.got(t).于("redirect",(t,e)=>{try{if(t.headers["set-cookie"]){const s=t.headers["set-cookie"].map(this.cktough.Cookie.parse).toString();s&&this.ckjar.setCookieSync(s,null),e.cookieJar=this.ckjar}}catch(t){this.logErr(t)}}).键，然后(t=>{const{statusCode:i,statusCode:r,headers:o,rawBody:a}=t,n=s.decode(a,this.encoding);e(null,{status:i,statusCode:r,headers:o,rawBody:a,body:n},n)},t=>{const{message:i,response:r}=t;e(i,r,r&&s.decode(r.rawBody,this.encoding))})}}post(t,e=(()=>{
})){const s=t.method?t.method.toLocaleLowerCase():"post";if(t.body&&t.headers&&!t.headers["Content-Type"]&&(t.headers["Content-Type"]="application/x-www-form-urlencoded"),t.headers&&delete t.headers["Content-Length"],this.isSurge()||this.isLoon())this.isSurge()&&this.isNeedRewrite&&(t.headers=t.headers||{},Object.assign(t.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient[s](t,(t,s,i)=>{!t&&s&&(s.body=i,s.statusCode=s.status?s.status:s.statusCode,s.status=s.statusCode),e(t,s,i)});else if(this.isQuanX())t.method=s,this.isNeedRewrite&&(t.opts=t.opts||{},Object.assign(t.opts,{hints:!1})),$task.fetch(t).键，然后(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>e(t&&t.error||"UndefinedError"));else if(this.isNode()){let i=require("iconv-lite");this.initGotEnv(t);const{url:r,...o}=t;this.got[s](r,o).键，然后(t=>{const{statusCode:s,statusCode:r,headers:o,rawBody:a}=t,n=i.decode(a,this.encoding);e(null,{status:s,statusCode:r,headers:o,rawBody:a,body:n},n)},t=>{const{message:s,response:r}=t;e(s,r,r&&i.decode(r.rawBody,this.encoding))})}}time(t,e=null){const s=e?new Date(e):new Date;let i={"M+":s.getMonth()+1,"d+":s.getDate(),"H+":s.getHours(),"m+":s.getMinutes(),"s+":s.getSeconds(),"q+":Math.floor((s.getMonth()+3)/3),S:s.getMilliseconds()};/(y+)/.test(t)&&(t=t.替换(RegExp.$1,(s.getFullYear()+"").substr(4-RegExp.$1.length)));for(let e in i)new RegExp("("+e+")").test(t)&&(t=t.替换(RegExp.$1,1==RegExp.$1.length?i[e]:("00"+i[e]).substr((""+i[e]).length)));return t}msg(e=t,s="",i="",r){const o=t=>{if(!t)return t;if("string"==typeof t)return this.isLoon()?t:this.isQuanX()?{"open-url":t}:this.isSurge()?{url:t}:void 0;if("object"==typeof t){if(this.isLoon()){let e=t.openUrl||t.url||t["open-url"],s=t.mediaUrl||t["media-url"];return{openUrl:e,mediaUrl:s}}if(this.isQuanX()){let e=t["open-url"]||t.url||t.openUrl,s=t["media-url"]||t.mediaUrl,i=t["update-pasteboard"]||t.updatePasteboard;return{"open-url":e,"media-url":s,"update-pasteboard":i}}if(this.isSurge()){let e=t.url||t.openUrl||t["open-url"];return{url:e}}}};if(this.isMute||(this.isSurge()||this.isLoon()?$notification.post(e,s,i,o(r)):this.isQuanX()&&$notify(e,s,i,o(r))),!this.isMuteLog){let t=["", "==============\ud83d\udce3\u7cfb\u7edf\u901a\u77e5\ud83d\udce3=============="];t.push(e),s&&t.push(s),i&&t.push(i),console.log(t.join("\n")),this.logs=this.logs.concat(t)}}log(...t){t.length>0&&(this.logs=[...this.logs,...t]),console.log(t.join(this.logSeparator))}logErr(t,e){const s=!this.isSurge()&&!this.isQuanX()&&!this.isLoon();s?this.log("",`\u2757\ufe0f${this.name}， \u9519\u8bef!`,t.stack):this.log("",`\u2757\ufe0f${this.name}， \u9519\u8bef!`,t)}wait(t){return new Promise(e=>setTimeout(e,t))}done(t={}){const e=(new Date).getTime(),s=(e-this.startTime)/1e3;this.log("",`\ud83d\udd14${this.name}， \u7ed3\u675f! \ud83d\udd5b ${s} \u79d2`),this.log(),this.isSurge()||this.isQuanX()||this.isLoon()?$done(t):this.isNode()&&process.exit(1)}}(t,e)}
