/*
脚本名称：长城汽车自动签到 (修复版)
更新时间：2024-05-20
活动入口：长城/坦克汽车APP-我的-签到
功能说明：自动抓取Token，每日自动签到
使用说明：配置好重写规则后，打开APP点击“我的”页面即可获取Token。

================ Surge 配置 ================
[MITM]
hostname = %APPEND% app-api.gwm.com.cn

[Script]
# 注意：pattern 中 v1 改为了 v.*? 以匹配更多版本
获取长城Token = type=http-response, pattern=^https:\/\/app-api\.gwm\.com\.cn\/app\/v.*?\/user\/info, requires-body=1, max-size=0, script-path=gwm_auto.js
长城汽车签到 = type=cron, cronexp=15 9 * * *, timeout=60, script-path=gwm_auto.js, wake-system=1

============ Quantumult X 配置 =============
[MITM]
hostname = app-api.gwm.com.cn

[rewrite_local]
# 修复了匹配规则，支持 v1/v2/v3 等所有版本
^https:\/\/app-api\.gwm\.com\.cn\/app\/v.*?\/user\/info url script-response-body gwm_auto.js

[task_local]
15 9 * * * gwm_auto.js, tag=长城汽车签到, enabled=true

============ Loon 配置 ================
[MITM]
hostname = app-api.gwm.com.cn

[Script]
cron "15 9 * * *" script-path=gwm_auto.js, tag=长城汽车签到
http-response ^https:\/\/app-api\.gwm\.com\.cn\/app\/v.*?\/user\/info script-path=gwm_auto.js, requires-body=true, timeout=10, tag=获取长城Token

*/

// ==================== 配置区域 ====================
const $ = new Env('长城汽车签到');
const origin = 'https://app-api.gwm.com.cn';
const GWM_TOKEN_KEY = 'gwm_token';
const GWM_USER_KEY = 'gwm_user_info';
const Notify = 1;  // 0 关闭通知，1 打开通知
$.messages = [];

// ==================== 变量初始化 ====================
$.is_debug = ($.isNode() ? process.env.IS_DEBUG : $.getdata('is_debug')) || 'false';
// 兼容 Node 环境和 BoxJs 等环境
let token = ($.isNode() ? process.env.gwm_token : $.getdata(GWM_TOKEN_KEY)) || '';
let tokenArr = [];

// API 接口配置
const Api = {
    "signIn": {
        "url": "/app/v1/activity/sign_in",
        "method": "POST"
    },
    "userInfo": {
        "url": "/app/v1/user/info",
        "method": "GET"
    },
    "signStatus": {
        "url": "/app/v1/activity/sign_status",
        "method": "GET"
    }
}

// ==================== 主程序入口 ====================
!(async () => {
    try {
        // 1. 检查是否为重写/请求拦截（获取Token模式）
        if (typeof $request !== 'undefined') {
            await GetToken();
            return;
        }

        // 2. 正常运行模式
        console.log(`\n========== ${$.name} 开始执行 ==========\n`);

        await checkEnv();

        if (!tokenArr[0]) {
            throw new Error('❌ 未获取到Token\n\n【获取步骤】\n1. 确保配置了 rewrite/重写 规则\n2. 确保 MITM 包含了 app-api.gwm.com.cn\n3. 打开APP -> 点击"我的" -> 等待页面加载或下拉刷新');
        }

        await main();

    } catch (e) {
        $.messages.push(e.message || String(e));
        console.log(`\n❌ 错误: ${e}`);
    } finally {
        await sendMsg($.messages.join('\n'));
        $.done();
    }
})();

// ==================== 获取并保存Token (核心修复部分) ====================
async function GetToken() {
    try {
        // 打印日志证明脚本已被触发
        console.log(`🔔 [检测] 捕获到目标URL: ${$request.url}`);
        
        let tokenVal = '';
        let userInfo = {};

        // 【方案1】从请求头 Header 中提取
        if ($request && $request.headers) {
            const headers = $request.headers;
            // 兼容 key 的大小写
            const keyMap = Object.keys(headers).reduce((acc, key) => {
                acc[key.toLowerCase()] = headers[key];
                return acc;
            }, {});

            // 常见的 Token 字段名
            const authKeys = ['authorization', 'token', 'x-token', 'gwm-token'];
            
            for (let key of authKeys) {
                if (keyMap[key]) {
                    tokenVal = keyMap[key];
                    console.log(`✅ [Header] 发现 Token (${key})`);
                    break;
                }
            }
        }

        // 【方案2】从响应体 Body 中提取 (作为备用)
        if (!tokenVal && $response && $response.body) {
            try {
                let bodyStr = $response.body;
                let body = JSON.parse(bodyStr);
                
                if (body.data && body.data.token) {
                    tokenVal = body.data.token;
                    console.log(`✅ [Body] 响应体中发现 Token`);
                }
                
                // 顺便提取用户信息
                if (body.data) {
                    userInfo.userId = body.data.userId;
                    userInfo.userName = body.data.userName || body.data.nickName;
                }
            } catch (e) {
                console.log(`⚠️ 响应体解析失败 (非JSON或解密失败): ${e}`);
            }
        }

        // 【保存逻辑】
        if (tokenVal) {
            // 清理 Token 格式（有些 Authorization 带 Bearer 前缀，有些不带，通常长城的不带，但为了保险）
            // if (tokenVal.startsWith("Bearer ")) tokenVal = tokenVal.substring(7);

            let oldToken = $.getdata(GWM_TOKEN_KEY);
            
            if (oldToken !== tokenVal) {
                $.setdata(tokenVal, GWM_TOKEN_KEY);
                console.log(`🎉 Token 获取成功！已保存。`);
                console.log(`Token预览: ${tokenVal.substring(0, 15)}...`);
                $.msg($.name, "🎉 Token获取成功", "请回到脚本列表或等待定时任务执行签到");
            } else {
                console.log(`ℹ️ Token 与旧值一致，跳过保存。`);
            }
        } else {
            console.log(`❌ 未能从请求头或响应体中提取到有效 Token`);
            // 输出部分 Header 帮助调试
            // console.log(JSON.stringify($request.headers));
        }

    } catch (e) {
        console.log(`❌ GetToken 内部错误: ${e}`);
    }
}

// ==================== 主执行流程 ====================
async function main() {
    for (let i = 0; i < tokenArr.length; i++) {
        $.currentToken = tokenArr[i];
        console.log(`\n➤ [账号 ${i + 1}/${tokenArr.length}] 开始执行`);

        $.result = ''; // 重置当前账号结果
        
        // 1. 获取用户信息
        let userStatus = await getUserInfo();
        
        // 2. 如果Token有效，执行签到
        if (userStatus) {
            await signIn();
        } else {
            $.result += "⚠️ Token失效，跳过签到\n";
        }

        // 记录结果
        if ($.result) $.messages.push($.result);
        
        // 随机延迟防止封号
        if (i < tokenArr.length - 1) await $.wait(Math.floor(Math.random() * 2000 + 2000));
    }
}

// ==================== 接口: 签到 ====================
async function signIn() {
    try {
        let result = await httpRequest(
            options(Api.signIn.url, JSON.stringify({}), Api.signIn.method)
        );

        debug(result, "签到结果");

        if (!result) {
            $.result += `❌ 签到请求失败\n`;
            return;
        }

        if (result.code === 200 || result.success === true) {
            $.result += `✅ 签到成功\n`;
            if (result.data) {
                const points = result.data.points || result.data.reward || result.data.integralValue || 0;
                const msg = result.data.message || result.message || '';
                $.result += `获得: ${points} 积分 ${msg}\n`;
            }
        } else if (result.code === 1001 || (JSON.stringify(result).includes('重复'))) {
            $.result += `⚠️ 今日已签到\n`;
        } else if (result.code === 401 || result.code === 403) {
            $.result += `❌ Token失效 (401/403)\n`;
        } else {
            $.result += `❌ 失败: ${result.message || result.code}\n`;
        }

    } catch (e) {
        $.result += `❌ 签到异常: ${e.message}\n`;
    }
}

// ==================== 接口: 用户信息 ====================
async function getUserInfo() {
    try {
        let result = await httpRequest(
            options(Api.userInfo.url, '', Api.userInfo.method)
        );

        debug(result, "用户信息");

        if (result && (result.code === 200 || result.success === true) && result.data) {
            const phone = result.data.mobile || result.data.phone || '未设置';
            const name = result.data.userName || result.data.name || '车主';
            const score = result.data.integralBalance || result.data.points || 0;
            
            console.log(`✅ 登录成功: ${name} (${hidePhone(phone)})`);
            $.result += `账号: ${name} | 积分: ${score}\n`;
            return true;
        } else {
            console.log(`⚠️ 用户信息获取失败: ${JSON.stringify(result)}`);
            return false;
        }
    } catch (e) {
        console.log(`❌ getUserInfo 异常: ${e}`);
        return false;
    }
}

// ==================== 辅助函数 ====================
async function checkEnv() {
    tokenArr = token.split('@').filter(t => t && t.trim().length > 10);
    console.log(`✅ 检测到 ${tokenArr.length} 个账号配置`);
}

function hidePhone(str) {
    if (!str || str.length < 7) return str;
    return str.substring(0, 3) + "****" + str.substring(str.length - 4);
}

function options(url, body = '', method = 'GET') {
    let opt = {
        url: `${origin}${url}`,
        headers: {
            "Host": "app-api.gwm.com.cn",
            "Content-Type": "application/json;charset=utf-8",
            "Accept": "*/*",
            "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 GWMBrand/8.0.0",
            "Authorization": $.currentToken
        },
        timeout: 15000
    };
    if (body) {
        opt.body = body;
        opt.method = method;
    }
    return opt;
}

function httpRequest(opt) {
    return new Promise((resolve) => {
        $[opt.method.toLowerCase()](opt, (err, resp, data) => {
            if (err) {
                resolve(null);
            } else {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    resolve(data);
                }
            }
        });
    });
}

async function sendMsg(message) {
    if (!message) return;
    if (Notify > 0) {
        $.msg($.name, '', message);
    }
}

function debug(content, title = "DEBUG") {
    if ($.is_debug === 'true') {
        console.log(`\n--- ${title} ---\n${typeof content === 'object' ? JSON.stringify(content) : content}\n----------------`);
    }
}

// ==================== Env 环境定义 (固定模板) ====================
function Env(t,e){class s{constructor(t){this.env=t}send(t,e="GET"){t="string"==typeof t?{url:t}:t;let s=this.get;return"POST"===e&&(s=this.post),new Promise((e,i)=>{s.call(this,t,(t,s,r)=>{t?i(t):e(s)})})}get(t){return this.send.call(this.env,t)}post(t){return this.send.call(this.env,t,"POST")}}return new class{constructor(t,e){this.name=t,this.http=new s(this),this.data=null,this.dataFile="box.dat",this.logs=[],this.isMute=!1,this.isNeedRewrite=!1,this.logSeparator="\n",this.encoding="utf-8",this.startTime=(new Date).getTime(),Object.assign(this,e)}isNode(){return"undefined"!=typeof module&&!!module.exports}isQuanX(){return"undefined"!=typeof $task}isSurge(){return"undefined"!=typeof $httpClient&&"undefined"==typeof $loon}isLoon(){return"undefined"!=typeof $loon}toObj(t,e=null){try{return JSON.parse(t)}catch{return e}}toStr(t,e=null){try{return JSON.stringify(t)}catch{return e}}getdata(t){let e=this.getval(t);if(/^@/.test(t)){const s=/^@(.*?)\.(.*?)$/,i=s.exec(t);if(i){const[,r,o]=i,n=r?this.getval(r):"";if(n)try{const t=JSON.parse(n);e=t?this.lodash_get(t,o,""):e}catch(t){e=""}}}return e}setdata(t,e){let s=!1;if(/^@/.test(e)){const i=/^@(.*?)\.(.*?)$/,r=i.exec(e);if(r){const[,o,n]=r,a=this.getval(o),c=o?"null"===a?null:a||"{}":"{}";try{const e=JSON.parse(c);this.lodash_set(e,n,t),s=this.setval(JSON.stringify(e),o)}catch(e){const a={};this.lodash_set(a,n,t),s=this.setval(JSON.stringify(a),o)}}}else s=this.setval(t,e);return s}lodash_get(t,e,s){const i=e.replace(/\[(\d+)\]/g,".$1").split(".");let r=t;for(const t of i)if(r=Object(r)[t],void 0===r)return s;return r}lodash_set(t,e,s){return Object(t)!==t?t:(Array.isArray(e)||(e=e.toString().match(/[^.[\]]+/g)||[]),e.slice(0,-1).reduce((t,s,i)=>Object(t[s])===t[s]?t[s]:t[s]=Math.abs(e[i+1])>>0==e[i+1]?[]:{},t),t[e[e.length-1]]=s,t)}getval(t){return this.isSurge()||this.isLoon()?$persistentStore.read(t):this.isQuanX()?$prefs.valueForKey(t):this.isNode()?(this.data=this.loaddata(),this.data[t]):this.data&&this.data[t]}setval(t,e){return this.isSurge()||this.isLoon()?$persistentStore.write(t,e):this.isQuanX()?$prefs.setValueForKey(t,e):this.isNode()?(this.data=this.loaddata(),this.data[e]=t,this.writedata(),!0):this.data&&(this.data[e]=t)}loaddata(){if(!this.isNode())return{};this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),e=this.path.resolve(process.cwd(),this.dataFile),s=this.fs.existsSync(t),i=!s&&this.fs.existsSync(e);if(!s&&!i)return{};const r=s?t:e;try{return JSON.parse(this.fs.readFileSync(r))}catch(t){return{}}}writedata(){if(this.isNode()){this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),e=this.path.resolve(process.cwd(),this.dataFile),s=this.fs.existsSync(t),i=!s&&this.fs.existsSync(e),r=JSON.stringify(this.data);s?this.fs.writeFileSync(t,r):i?this.fs.writeFileSync(e,r):this.fs.writeFileSync(t,r)}}time(t,e=null){const s=e?new Date(e):new Date;let i={"M+":s.getMonth()+1,"d+":s.getDate(),"H+":s.getHours(),"m+":s.getMinutes(),"s+":s.getSeconds(),"q+":Math.floor((s.getMonth()+3)/3),S:s.getMilliseconds()};/(y+)/.test(t)&&(t=t.replace(RegExp.$1,(s.getFullYear()+"").substr(4-RegExp.$1.length)));for(let e in i)new RegExp("("+e+")").test(t)&&(t=t.replace(RegExp.$1,1==RegExp.$1.length?i[e]:("00"+i[e]).substr((""+i[e]).length)));return t}msg(e=t,s="",i="",r){const o=t=>{if(!t)return t;if("string"==typeof t)return this.isLoon()?t:this.isQuanX()?{"open-url":t}:this.isSurge()?{url:t}:void 0;if("object"==typeof t){if(this.isLoon()){let e=t.openUrl||t.url||t["open-url"],s=t.mediaUrl||t["media-url"];return{openUrl:e,mediaUrl:s}}if(this.isQuanX()){let e=t["open-url"]||t.url||t.openUrl,s=t["media-url"]||t.mediaUrl,i=t["update-pasteboard"]||t.updatePasteboard;return{"open-url":e,"media-url":s,"update-pasteboard":i}}if(this.isSurge()){let e=t.url||t.openUrl||t["open-url"];return{url:e}}}};this.isMute||(this.isSurge()||this.isLoon()?$notification.post(e,s,i,o(r)):this.isQuanX()&&$notify(e,s,i,o(r)));let n=["","==============📣系统通知📣=============="];n.push(e),s&&n.push(s),i&&n.push(i),console.log(n.join("\n")),this.logs=this.logs.concat(n)}log(...t){t.length>0&&(this.logs=[...this.logs,...t]),console.log(t.join(this.logSeparator))}logErr(t,e){const s=!this.isSurge()&&!this.isQuanX()&&!this.isLoon();s?this.log("",`❗️${this.name}, 错误!`,t.stack):this.log("",`❗️${this.name}, 错误!`,t)}wait(t){return new Promise(e=>setTimeout(e,t))}done(t={}){const e=(new Date).getTime(),s=(e-this.startTime)/1000;this.log("",`🔔${this.name}, 结束! 🕛 ${s} 秒`),this.log(),(this.isSurge()||this.isQuanX()||this.isLoon())?$done(t):this.isNode()&&process.exit(1)}}(t,e)}
