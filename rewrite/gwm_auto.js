/*
脚本名称：长城汽车自动签到
活动入口：长城/坦克汽车APP-我的-签到
环境变量：gwm_token（多账号以@隔开）
使用说明：
1. 配置重写规则 (Rewrite)
2. 打开APP，点击“我的”页面即可自动获取Token
3. 脚本会自动去重，Token变动时才会弹窗提示

================ Surge 配置 ================
[MITM]
hostname = %APPEND% app-api.gwm.com.cn

[Script]
# 正则匹配 v1/v2 等所有版本接口
获取长城Token = type=http-response, pattern=^https:\/\/app-api\.gwm\.com\.cn\/app\/v.*?\/user\/info, requires-body=1, max-size=0, script-path=https://raw.githubusercontent.com/duoxiong/Quantumult-X/refs/heads/main/rewrite/gwm_auto.js
长城汽车签到 = type=cron, cronexp=15 9 * * *, timeout=60, script-path=https://raw.githubusercontent.com/duoxiong/Quantumult-X/refs/heads/main/rewrite/gwm_auto.js, wake-system=1

============ Quantumult X 配置 =============
[MITM]
hostname = app-api.gwm.com.cn

[rewrite_local]
^https:\/\/app-api\.gwm\.com\.cn\/app\/v.*?\/user\/info url script-response-body https://raw.githubusercontent.com/duoxiong/Quantumult-X/refs/heads/main/rewrite/gwm_auto.js

[task_local]
15 9 * * * https://raw.githubusercontent.com/duoxiong/Quantumult-X/refs/heads/main/rewrite/gwm_auto.js, tag=长城汽车签到, enabled=true

============ Loon 配置 ================
[MITM]
hostname = app-api.gwm.com.cn

[Script]
cron "15 9 * * *" script-path=https://raw.githubusercontent.com/duoxiong/Quantumult-X/refs/heads/main/rewrite/gwm_auto.js, tag=长城汽车签到
http-response ^https:\/\/app-api\.gwm\.com\.cn\/app\/v.*?\/user\/info script-path=https://raw.githubusercontent.com/duoxiong/Quantumult-X/refs/heads/main/rewrite/gwm_auto.js, requires-body=true, timeout=10, tag=获取长城Token
*/

const $ = new Env('长城汽车签到');
const origin = 'https://app-api.gwm.com.cn';
const GWM_TOKEN_KEY = 'gwm_token';
// 调试模式开关：true开启，false关闭
$.is_debug = ($.isNode() ? process.env.IS_DEBUG : $.getdata('is_debug')) || 'false';

// ==================== 变量初始化 ====================
let token = ($.isNode() ? process.env.gwm_token : $.getdata(GWM_TOKEN_KEY)) || '';
let tokenArr = [];
let notifyMsg = [];

// API 接口配置
const Api = {
    signIn: { url: "/app/v1/activity/sign_in", method: "POST" },
    userInfo: { url: "/app/v1/user/info", method: "GET" }
};

// ==================== 主逻辑入口 ====================
!(async () => {
    try {
        // 场景1：重写脚本，提取Token
        if (typeof $request !== 'undefined') {
            await getToken();
            return;
        }

        // 场景2：定时任务，执行签到
        console.log(`\n========== ${$.name} 开始执行 ==========\n`);
        
        if (!await checkEnv()) return;

        for (let i = 0; i < tokenArr.length; i++) {
            $.currentToken = tokenArr[i];
            $.result = ''; // 单个账号结果缓存
            
            console.log(`\n➤ [账号 ${i + 1}/${tokenArr.length}] 开始执行`);
            
            // 1. 获取并验证用户信息
            let userInfo = await getUserInfo();
            
            // 2. 签到逻辑
            if (userInfo) {
                await signIn();
            } else {
                $.result = `❌ Token已失效，请重新获取`;
            }

            // 汇总日志
            console.log($.result);
            notifyMsg.push($.result);

            // 随机延迟 2-5 秒，防止频繁请求被风控
            if (i < tokenArr.length - 1) {
                let delay = Math.floor(Math.random() * 3000) + 2000;
                console.log(`⏳ 随机延迟 ${delay/1000} 秒...`);
                await $.wait(delay);
            }
        }
    } catch (e) {
        console.log(`❌ 脚本执行异常: ${e}`);
        notifyMsg.push(`❌ 脚本异常: ${e.message}`);
    } finally {
        if (notifyMsg.length > 0) {
            await sendMsg(notifyMsg.join('\n\n'));
        }
        $.done();
    }
})();

// ==================== 方法：提取Token ====================
async function getToken() {
    try {
        let newToken = '';
        
        // 1. 尝试从 Header 提取 (忽略大小写)
        if ($request.headers) {
            const headers = $request.headers;
            const keyMap = Object.keys(headers).reduce((acc, key) => {
                acc[key.toLowerCase()] = headers[key];
                return acc;
            }, {});
            
            // 常见的 Token 字段
            const possibleKeys = ['authorization', 'token', 'x-token'];
            for (const key of possibleKeys) {
                if (keyMap[key]) {
                    newToken = keyMap[key];
                    console.log(`✅ 从 Header[${key}] 提取到 Token`);
                    break;
                }
            }
        }

        // 2. 尝试从 Body 提取 (备选)
        if (!newToken && $response.body) {
            try {
                let body = JSON.parse($response.body);
                if (body.data && body.data.token) {
                    newToken = body.data.token;
                    console.log(`✅ 从 响应体 提取到 Token`);
                }
            } catch (e) {
                // 忽略非JSON响应
            }
        }

        // 3. 保存逻辑
        if (newToken) {
            let oldToken = $.getdata(GWM_TOKEN_KEY);
            if (oldToken !== newToken) {
                $.setdata(newToken, GWM_TOKEN_KEY);
                $.msg($.name, "🎉 Token获取成功", "账号数据已更新，下次任务生效");
                console.log(`🎉 Token更新成功: ${newToken.substring(0, 10)}...`);
            } else {
                console.log(`ℹ️ Token未发生变化，跳过保存`);
            }
        } else {
            console.log(`⚠️ 未能提取到有效Token，请检查接口是否变更`);
        }
    } catch (e) {
        console.log(`❌ Token提取异常: ${e}`);
    }
}

// ==================== 方法：用户查询 ====================
async function getUserInfo() {
    try {
        let res = await httpRequest(Api.userInfo.url, Api.userInfo.method);
        
        if (res && (res.code === 200 || res.success === true) && res.data) {
            const name = res.data.userName || res.data.name || '用户';
            const phone = res.data.mobile || res.data.phone || '未知';
            const score = res.data.integralBalance || res.data.points || 0;
            
            console.log(`✅ 登录成功: ${name} | 尾号: ${phone.slice(-4)}`);
            $.result += `账号: ${name} (${phone.slice(-4)})\n当前积分: ${score}\n`;
            return true;
        }
        return false;
    } catch (e) {
        console.log(`❌ 获取用户信息失败: ${e}`);
        return false;
    }
}

// ==================== 方法：执行签到 ====================
async function signIn() {
    try {
        let res = await httpRequest(Api.signIn.url, Api.signIn.method, {});
        
        if (!res) {
            $.result += `❌ 请求失败 (网络/服务器错误)`;
            return;
        }

        if (res.code === 200 || res.success === true) {
            const points = res.data?.points || res.data?.reward || 0;
            const msg = res.data?.message || res.message || '';
            $.result += `✅ 签到成功: +${points} 积分 ${msg}`;
        } else if (res.code === 1001 || (JSON.stringify(res).includes('重复'))) {
            $.result += `⚠️ 今日已签到`;
        } else {
            $.result += `❌ 签到失败: ${res.message || res.code}`;
        }
    } catch (e) {
        $.result += `❌ 签到执行异常: ${e.message}`;
    }
}

// ==================== 工具函数 ====================

// 环境检查
async function checkEnv() {
    tokenArr = token.split('@').filter(t => t && t.trim().length > 10);
    if (tokenArr.length === 0) {
        console.log('❌ 未找到有效Token，请先通过App获取');
        $.msg($.name, "❌ 无法执行", "请先配置重写规则并在APP中获取Token");
        return false;
    }
    console.log(`✅ 共检测到 ${tokenArr.length} 个账号`);
    return true;
}

// 统一请求封装
function httpRequest(url, method, body = null) {
    return new Promise((resolve) => {
        const options = {
            url: `${origin}${url}`,
            headers: {
                "Content-Type": "application/json;charset=utf-8",
                "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 GWMBrand/8.0.0",
                "Authorization": $.currentToken
            },
            timeout: 10000
        };
        
        if (body) {
            options.body = JSON.stringify(body);
        }

        const callback = (err, resp, data) => {
            if (err) {
                console.log(`Http Request Error: ${err}`);
                resolve(null);
            } else {
                try {
                    // 调试日志
                    if ($.is_debug === 'true') console.log(`Response: ${data}`);
                    resolve(JSON.parse(data));
                } catch (e) {
                    console.log(`JSON Parse Error: ${e}`);
                    resolve(null);
                }
            }
        };

        if (method === 'POST') {
            $.post(options, callback);
        } else {
            $.get(options, callback);
        }
    });
}

// 消息发送
async function sendMsg(message) {
    if (!message) return;
    // Node环境尝试加载通知模块，其他环境直接弹窗
    if ($.isNode()) {
        try {
            const notify = require('./sendNotify');
            await notify.sendNotify($.name, message);
        } catch (e) {
            console.log(message);
        }
    } else {
        $.msg($.name, '', message);
    }
}

// ==================== Env 环境兼容 (压缩版) ====================
// prettier-ignore
function Env(t,e){class s{constructor(t){this.env=t}send(t,e="GET"){t="string"==typeof t?{url:t}:t;let s=this.get;return"POST"===e&&(s=this.post),new Promise((e,i)=>{s.call(this,t,(t,s,r)=>{t?i(t):e(s)})})}get(t){return this.send.call(this.env,t)}post(t){return this.send.call(this.env,t,"POST")}}return new class{constructor(t,e){this.name=t,this.http=new s(this),this.data=null,this.dataFile="box.dat",this.logs=[],this.isMute=!1,this.isNeedRewrite=!1,this.logSeparator="\n",this.encoding="utf-8",this.startTime=(new Date).getTime(),Object.assign(this,e)}isNode(){return"undefined"!=typeof module&&!!module.exports}isQuanX(){return"undefined"!=typeof $task}isSurge(){return"undefined"!=typeof $httpClient&&"undefined"==typeof $loon}isLoon(){return"undefined"!=typeof $loon}toObj(t,e=null){try{return JSON.parse(t)}catch{return e}}toStr(t,e=null){try{return JSON.stringify(t)}catch{return e}}getdata(t){let e=this.getval(t);if(/^@/.test(t)){const s=/^@(.*?)\.(.*?)$/,i=s.exec(t);if(i){const[,r,o]=i,n=r?this.getval(r):"";if(n)try{const t=JSON.parse(n);e=t?this.lodash_get(t,o,""):e}catch(t){e=""}}}return e}setdata(t,e){let s=!1;if(/^@/.test(e)){const i=/^@(.*?)\.(.*?)$/,r=i.exec(e);if(r){const[,o,n]=r,a=this.getval(o),c=o?"null"===a?null:a||"{}":"{}";try{const e=JSON.parse(c);this.lodash_set(e,n,t),s=this.setval(JSON.stringify(e),o)}catch(e){const a={};this.lodash_set(a,n,t),s=this.setval(JSON.stringify(a),o)}}}else s=this.setval(t,e);return s}lodash_get(t,e,s){const i=e.replace(/\[(\d+)\]/g,".$1").split(".");let r=t;for(const t of i)if(r=Object(r)[t],void 0===r)return s;return r}lodash_set(t,e,s){return Object(t)!==t?t:(Array.isArray(e)||(e=e.toString().match(/[^.[\]]+/g)||[]),e.slice(0,-1).reduce((t,s,i)=>Object(t[s])===t[s]?t[s]:t[s]=Math.abs(e[i+1])>>0==e[i+1]?[]:{},t),t[e[e.length-1]]=s,t)}getval(t){return this.isSurge()||this.isLoon()?$persistentStore.read(t):this.isQuanX()?$prefs.valueForKey(t):this.isNode()?(this.data=this.loaddata(),this.data[t]):this.data&&this.data[t]}setval(t,e){return this.isSurge()||this.isLoon()?$persistentStore.write(t,e):this.isQuanX()?$prefs.setValueForKey(t,e):this.isNode()?(this.data=this.loaddata(),this.data[e]=t,this.writedata(),!0):this.data&&(this.data[e]=t)}loaddata(){if(!this.isNode())return{};this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),e=this.path.resolve(process.cwd(),this.dataFile),s=this.fs.existsSync(t),i=!s&&this.fs.existsSync(e);if(!s&&!i)return{};const r=s?t:e;try{return JSON.parse(this.fs.readFileSync(r))}catch(t){return{}}}writedata(){if(this.isNode()){this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),e=this.path.resolve(process.cwd(),this.dataFile),s=this.fs.existsSync(t),i=!s&&this.fs.existsSync(e),r=JSON.stringify(this.data);s?this.fs.writeFileSync(t,r):i?this.fs.writeFileSync(e,r):this.fs.writeFileSync(t,r)}}time(t,e=null){const s=e?new Date(e):new Date;let i={"M+":s.getMonth()+1,"d+":s.getDate(),"H+":s.getHours(),"m+":s.getMinutes(),"s+":s.getSeconds(),"q+":Math.floor((s.getMonth()+3)/3),S:s.getMilliseconds()};/(y+)/.test(t)&&(t=t.replace(RegExp.$1,(s.getFullYear()+"").substr(4-RegExp.$1.length)));for(let e in i)new RegExp("("+e+")").test(t)&&(t=t.replace(RegExp.$1,1==RegExp.$1.length?i[e]:("00"+i[e]).substr((""+i[e]).length)));return t}msg(e=t,s="",i="",r){const o=t=>{if(!t)return t;if("string"==typeof t)return this.isLoon()?t:this.isQuanX()?{"open-url":t}:this.isSurge()?{url:t}:void 0;if("object"==typeof t){if(this.isLoon()){let e=t.openUrl||t.url||t["open-url"],s=t.mediaUrl||t["media-url"];return{openUrl:e,mediaUrl:s}}if(this.isQuanX()){let e=t["open-url"]||t.url||t.openUrl,s=t["media-url"]||t.mediaUrl,i=t["update-pasteboard"]||t.updatePasteboard;return{"open-url":e,"media-url":s,"update-pasteboard":i}}if(this.isSurge()){let e=t.url||t.openUrl||t["open-url"];return{url:e}}}};this.isMute||(this.isSurge()||this.isLoon()?$notification.post(e,s,i,o(r)):this.isQuanX()&&$notify(e,s,i,o(r)));let n=["","==============📣系统通知📣=============="];n.push(e),s&&n.push(s),i&&n.push(i),console.log(n.join("\n")),this.logs=this.logs.concat(n)}log(...t){t.length>0&&(this.logs=[...this.logs,...t]),console.log(t.join(this.logSeparator))}logErr(t,e){const s=!this.isSurge()&&!this.isQuanX()&&!this.isLoon();s?this.log("",`❗️${this.name}, 错误!`,t.stack):this.log("",`❗️${this.name}, 错误!`,t)}wait(t){return new Promise(e=>setTimeout(e,t))}done(t={}){const e=(new Date).getTime(),s=(e-this.startTime)/1000;this.log("",`🔔${this.name}, 结束! 🕛 ${s} 秒`),this.log(),(this.isSurge()||this.isQuanX()||this.isLoon())?$done(t):this.isNode()&&process.exit(1)}}(t,e)}
