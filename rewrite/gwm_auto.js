/*
脚本名称：长城/坦克汽车自动签到 (Pro版)
脚本作者：GWM_User
更新时间：2026-01-20
脚本仓库：https://raw.githubusercontent.com/duoxiong/Quantumult-X/refs/heads/main/rewrite/gwm_auto.js
脚本功能：
1. [增强] 自动抓取长城系APP登录凭证，成功后立即弹窗提示。
2. [增强] 每日自动签到，支持结果通知。

================ Quantumult X 配置 ================

[MITM]
hostname = app-api.gwm.com.cn, gateway.gwm.com.cn

[rewrite_local]
# 抓取 Token (打开 APP -> 点击"我的" -> 触发抓取)
^https:\/\/(app-api|gateway)\.gwm\.com\.cn\/.*\/user\/info url script-request-header https://raw.githubusercontent.com/duoxiong/Quantumult-X/refs/heads/main/rewrite/gwm_auto.js

[task_local]
# 每日 09:00 自动签到
0 9 * * * https://raw.githubusercontent.com/duoxiong/Quantumult-X/refs/heads/main/rewrite/gwm_auto.js, tag=长城汽车签到, enabled=true

*/

const $ = new Env("长城汽车签到");

// ---------------- 配置区域 ----------------
const GWM_TOKEN_KEY = 'gwm_token'; // 缓存 Token 的 Key
const GWM_HOST = 'app-api.gwm.com.cn'; // 主机域名

// 接口配置
const API_URL = {
    sign: '/app/v1/activity/sign_in', // 签到接口
};
// -----------------------------------------

// 获取环境变量
let gwm_token = ($.isNode() ? process.env[GWM_TOKEN_KEY] : $.getdata(GWM_TOKEN_KEY)) || '';
let tokenArr = [];

!(async () => {
    // 场景 1：重写请求触发（自动抓取 Token）
    if (typeof $request !== 'undefined') {
        GetToken();
        return;
    }

    // 场景 2：定时任务触发（执行签到）
    console.log(`\n🔔 ${$.name} 脚本启动...`);
    
    // 检查是否有 Token
    if (!await checkEnv()) return;
    
    // 遍历账号执行
    for (let i = 0; i < tokenArr.length; i++) {
        let token = tokenArr[i];
        if (!token) continue;
        console.log(`\n👤 [账号 ${i + 1}] 开始执行...`);
        await signIn(token);
        // 随机延迟 2-5 秒，防止被风控
        let delay = Math.floor(Math.random() * 3000) + 2000;
        await $.wait(delay); 
    }
})()
.catch((e) => {
    console.log(`❌ 致命错误: ${e}`);
    $.msg($.name, "脚本运行异常", "请查看日志");
})
.finally(() => $.done());


// 📥 [增强版] 抓取 Token 逻辑
function GetToken() {
    if ($request && $request.headers) {
        const headers = $request.headers;
        // 打印 Header 方便调试 (可选)
        // console.log(`Headers: ${JSON.stringify(headers)}`);

        // 兼容各种 Key 写法 (大小写不敏感匹配)
        let tokenVal = '';
        const possibleKeys = ['Authorization', 'authorization', 'token', 'Token', 'Access-Token'];
        
        for (let key of possibleKeys) {
            if (headers[key]) {
                tokenVal = headers[key];
                break;
            }
        }
        
        if (tokenVal) {
            const oldToken = $.getdata(GWM_TOKEN_KEY);
            
            // 只有当 Token 变化时才保存和通知，避免重复刷屏
            if (oldToken !== tokenVal) {
                const saveResult = $.setdata(tokenVal, GWM_TOKEN_KEY);
                if (saveResult) {
                    // ✅ 抓取成功提示
                    const maskToken = tokenVal.length > 10 ? tokenVal.substring(0, 8) + "..." : tokenVal;
                    $.msg($.name, "🎉 抓取成功", `Token已更新: ${maskToken}`);
                    console.log(`✅ Token 获取并保存成功: ${maskToken}`);
                } else {
                    $.msg($.name, "❌ 保存失败", "BoxJS 数据写入失败");
                }
            } else {
                console.log("⚠️ Token 未变化，跳过保存");
            }
        } else {
            console.log(`❌ 未在 Header 中找到 Token`);
        }
    }
}


// 📝 [增强版] 执行签到逻辑
async function signIn(token) {
    const url = {
        url: `https://${GWM_HOST}${API_URL.sign}`,
        headers: {
            'Host': GWM_HOST,
            'Content-Type': 'application/json;charset=utf-8',
            'Connection': 'keep-alive',
            'Accept': 'application/json, text/plain, */*',
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 GWMBrand/8.0.0', // 模拟真实UA
            'Authorization': token, 
            'token': token          
        },
        body: JSON.stringify({}) // 空 Body
    };

    try {
        let result = await httpRequest(url, 'POST');
        
        console.log(`服务端响应: ${JSON.stringify(result)}`);
        
        if (result) {
            // 成功：通常 code 为 200 或 0，或者 success 为 true
            if (result.code == 200 || result.success === true || result.code === '0') {
                const msg = result.data || result.message || "签到成功";
                $.msg($.name, "✅ 签到成功", `奖励: ${msg}`);
            } 
            // 重复：code 1001 或 消息包含"重复"
            else if (result.code == 1001 || (result.message && result.message.includes("重复"))) {
                 $.msg($.name, "⚠️ 今日已签", "请勿重复签到");
            } 
            // 失效：code 401/403
            else if (result.code == 401 || result.code == 403) {
                $.msg($.name, "❌ Token失效", "请重新打开APP获取");
            } 
            // 其他错误
            else {
                const errorMsg = result.message || result.msg || `Code:${result.code}`;
                $.msg($.name, "❌ 签到失败", errorMsg);
            }
        } else {
            $.msg($.name, "❌ 网络错误", "无响应数据");
        }
    } catch (err) {
        console.log(`❌ 签到请求异常: ${err}`);
        $.msg($.name, "❌ 请求异常", "详见日志");
    }
}


// 🛠 环境检查
async function checkEnv() {
    if (gwm_token) {
        // 支持多账号
        if (gwm_token.indexOf('@') > -1) {
            tokenArr = gwm_token.split('@');
        } else {
            tokenArr = [gwm_token];
        }
        return true;
    } else {
        $.msg($.name, "🚫 无法执行", "请打开APP -> '我的' 获取Token");
        console.log("❌ 未找到 Token，请检查重写规则");
        return false;
    }
}


// 🌐 HTTP 请求封装 (带JSON容错)
function httpRequest(options, method = 'GET') {
    return new Promise((resolve) => {
        $[method.toLowerCase()](options, (err, resp, data) => {
            try {
                if (err) {
                    console.log(`❌ 网络请求失败: ${JSON.stringify(err)}`);
                    resolve(null);
                } else {
                    if (data) {
                        // 尝试解析 JSON
                        try {
                            data = JSON.parse(data);
                        } catch (e) {
                            console.log(`⚠️ 响应非 JSON (可能被拦截或网页报错): ${data}`);
                            // 如果需要，可以手动构造一个错误对象返回
                        }
                    }
                    resolve(data);
                }
            } catch (e) {
                resolve(null);
            }
        });
    });
}

// ==============================================================================
// 🤖 Env 工具类 (稳定版，无需修改)
// ==============================================================================
function Env(name, opts) {
  class Http {
    constructor(env) {
      this.env = env;
    }
    send(opts, method = 'GET') {
      opts = typeof opts === 'string' ? { url: opts } : opts;
      let sender = this.get;
      if (method === 'POST') {
        sender = this.post;
      }
      return new Promise((resolve, reject) => {
        sender.call(this, opts, (err, resp, body) => {
          if (err) reject(err);
          else resolve(resp);
        });
      });
    }
    get(opts) {
      return this.send.call(this.env, opts);
    }
    post(opts) {
      return this.send.call(this.env, opts, 'POST');
    }
  }

  return new (class {
    constructor(name, opts) {
      this.name = name;
      this.http = new Http(this);
      this.data = null;
      this.dataFile = 'box.dat';
      this.logs = [];
      this.isMute = false;
      this.isNeedRewrite = false;
      this.logSeparator = '\n';
      this.startTime = new Date().getTime();
      Object.assign(this, opts);
      this.log('', `🔔${this.name}, 开始!`);
    }

    isNode() {
      return 'undefined' !== typeof module && !!module.exports;
    }

    isQuanX() {
      return 'undefined' !== typeof $task;
    }

    isSurge() {
      return 'undefined' !== typeof $httpClient && 'undefined' === typeof $loon;
    }

    isLoon() {
      return 'undefined' !== typeof $loon;
    }

    toObj(str, defaultValue = null) {
      try {
        return JSON.parse(str);
      } catch {
        return defaultValue;
      }
    }

    toStr(obj, defaultValue = null) {
      try {
        return JSON.stringify(obj);
      } catch {
        return defaultValue;
      }
    }

    getjson(key, defaultValue) {
      let json = defaultValue;
      const val = this.getdata(key);
      if (val) {
        try {
          json = JSON.parse(this.getdata(key));
        } catch {}
      }
      return json;
    }

    setjson(val, key) {
      try {
        return this.setdata(JSON.stringify(val), key);
      } catch {
        return false;
      }
    }

    getdata(key) {
      let val = this.getval(key);
      if (/^@/.test(key)) {
        const [, objKey, paths] = /^@(.*?)\.(.*?)$/.exec(key);
        const objVal = objKey ? this.getval(objKey) : '';
        if (objVal) {
          try {
            const objedVal = JSON.parse(objVal);
            val = objedVal ? this.lodash_get(objedVal, paths, '') : val;
          } catch {
            val = '';
          }
        }
      }
      return val;
    }

    setdata(val, key) {
      let issuc = false;
      if (/^@/.test(key)) {
        const [, objKey, paths] = /^@(.*?)\.(.*?)$/.exec(key);
        const objdat = this.getval(objKey);
        const obj = objKey ? (objdat === 'null' ? null : objdat || '{}') : '{}';
        try {
          const objed = JSON.parse(obj);
          this.lodash_set(objed, paths, val);
          issuc = this.setval(JSON.stringify(objed), objKey);
        } catch (e) {
          const objed = {};
          this.lodash_set(objed, paths, val);
          issuc = this.setval(JSON.stringify(objed), objKey);
        }
      } else {
        issuc = this.setval(val, key);
      }
      return issuc;
    }

    getval(key) {
      if (this.isSurge() || this.isLoon()) {
        return $persistentStore.read(key);
      } else if (this.isQuanX()) {
        return $prefs.valueForKey(key);
      } else if (this.isNode()) {
        this.data = this.loaddata();
        return this.data[key];
      } else {
        return (this.data && this.data[key]) || null;
      }
    }

    setval(val, key) {
      if (this.isSurge() || this.isLoon()) {
        return $persistentStore.write(val, key);
      } else if (this.isQuanX()) {
        return $prefs.setValueForKey(val, key);
      } else if (this.isNode()) {
        this.data = this.loaddata();
        this.data[key] = val;
        this.writedata();
        return true;
      } else {
        return (this.data && this.data[key]) || null;
      }
    }

    initGotEnv(opts) {
      this.got = this.got ? this.got : require('got');
      this.cktough = this.cktough ? this.cktough : require('tough-cookie');
      this.ckjar = this.ckjar ? this.ckjar : new this.cktough.CookieJar();
      if (opts) {
        opts.headers = opts.headers ? opts.headers : {};
        if (undefined === opts.headers.Cookie && undefined === opts.cookieJar) {
          opts.cookieJar = this.ckjar;
        }
      }
    }

    get(opts, callback = () => {}) {
      if (opts.headers) {
        delete opts.headers['Content-Type'];
        delete opts.headers['Content-Length'];
      }
      if (this.isSurge() || this.isLoon()) {
        if (this.isSurge() && this.isNeedRewrite) {
          opts.headers = opts.headers || {};
          Object.assign(opts.headers, { 'X-Surge-Skip-Scripting': false });
        }
        $httpClient.get(opts, (err, resp, body) => {
          if (!err && resp) {
            resp.body = body;
            resp.statusCode = resp.status ? resp.status : resp.statusCode;
            resp.status = resp.statusCode;
          }
          callback(err, resp, body);
        });
      } else if (this.isQuanX()) {
        if (this.isNeedRewrite) {
          opts.opts = opts.opts || {};
          Object.assign(opts.opts, { hints: false });
        }
        $task.fetch(opts).then(
          (resp) => {
            const { statusCode: status, statusCode, headers, body } = resp;
            callback(null, { status, statusCode, headers, body }, body);
          },
          (err) => callback(err && err.error)
        );
      } else if (this.isNode()) {
        let iconv = require('iconv-lite');
        this.initGotEnv(opts);
        this.got(opts)
          .on('redirect', (resp, nextOpts) => {
            try {
              if (resp.headers['set-cookie']) {
                const ck = resp.headers['set-cookie']
                  .map(this.cktough.Cookie.parse)
                  .toString();
                if (ck) {
                  this.ckjar.setCookieSync(ck, null);
                }
                nextOpts.cookieJar = this.ckjar;
              }
            } catch (e) {
              this.logErr(e);
            }
          })
          .then(
            (resp) => {
              const { statusCode: status, statusCode, headers, rawBody } = resp;
              const body = iconv.decode(rawBody, this.encoding);
              callback(null, { status, statusCode, headers, rawBody, body }, body);
            },
            (err) => {
              const { message: msg, response: resp } = err;
              callback(msg, resp, resp && iconv.decode(resp.rawBody, this.encoding));
            }
          );
      }
    }

    post(opts, callback = () => {}) {
      const method = opts.method ? opts.method.toLocaleLowerCase() : 'post';
      if (
        opts.body &&
        opts.headers &&
        !opts.headers['Content-Type']
      ) {
        opts.headers['Content-Type'] = 'application/x-www-form-urlencoded';
      }
      if (opts.headers) {
        delete opts.headers['Content-Length'];
      }
      if (this.isSurge() || this.isLoon()) {
        if (this.isSurge() && this.isNeedRewrite) {
          opts.headers = opts.headers || {};
          Object.assign(opts.headers, { 'X-Surge-Skip-Scripting': false });
        }
        $httpClient[method](opts, (err, resp, body) => {
          if (!err && resp) {
            resp.body = body;
            resp.statusCode = resp.status ? resp.status : resp.statusCode;
            resp.status = resp.statusCode;
          }
          callback(err, resp, body);
        });
      } else if (this.isQuanX()) {
        opts.method = method;
        if (this.isNeedRewrite) {
          opts.opts = opts.opts || {};
          Object.assign(opts.opts, { hints: false });
        }
        $task.fetch(opts).then(
          (resp) => {
            const { statusCode: status, statusCode, headers, body } = resp;
            callback(null, { status, statusCode, headers, body }, body);
          },
          (err) => callback(err && err.error)
        );
      } else if (this.isNode()) {
        let iconv = require('iconv-lite');
        this.initGotEnv(opts);
        const { url, ...otherOpts } = opts;
        this.got[method](url, otherOpts).then(
          (resp) => {
            const { statusCode: status, statusCode, headers, rawBody } = resp;
            const body = iconv.decode(rawBody, this.encoding);
            callback(null, { status, statusCode, headers, rawBody, body }, body);
          },
          (err) => {
            const { message: msg, response: resp } = err;
            callback(msg, resp, resp && iconv.decode(resp.rawBody, this.encoding));
          }
        );
      }
    }

    log(...logs) {
      if (logs.length > 0) {
        this.logs = [...this.logs, ...logs];
      }
      console.log(logs.join(this.logSeparator));
    }

    logErr(err, msg) {
      const isSurge = this.isSurge();
      const isQuanX = this.isQuanX();
      const isLoon = this.isLoon();

      if (!isSurge && !isQuanX && !isLoon) {
        this.log('', `❗️${this.name}, 错误!`, err.stack);
      } else {
        this.log('', `❗️${this.name}, 错误!`, err);
      }
    }

    wait(time) {
      return new Promise((resolve) => {
        setTimeout(resolve, time);
      });
    }

    done(val = {}) {
      const endTime = new Date().getTime();
      const costTime = (endTime - this.startTime) / 1000;
      this.log('', `🔔${this.name}, 结束! 🕛 ${costTime} 秒`);
      this.log();
      if (this.isSurge() || this.isQuanX() || this.isLoon()) {
        $done(val);
      }
    }

    lodash_get(source, path, defaultValue = undefined) {
        const paths = path.replace(/\[(\d+)\]/g, '.$1').split('.');
        let result = source;
        for (const p of paths) {
          result = Object(result)[p];
          if (result === undefined) {
            return defaultValue;
          }
        }
        return result;
    }
    
    lodash_set(obj, path, value) {
        if (Object(obj) !== obj) return obj;
        if (!Array.isArray(path)) path = path.toString().match(/[^.[\]]+/g) || [];
        path.slice(0, -1).reduce((a, c, i) =>
             Object(a[c]) === a[c] ? a[c] : a[c] = Math.abs(path[i + 1]) >> 0 === +path[i + 1] ? [] : {},
             obj)[path[path.length - 1]] = value;
        return obj;
    }
  })(name, opts);
}
