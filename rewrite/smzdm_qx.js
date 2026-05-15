/*
什么值得买自动签到 (完美适配引用资源订阅)


[rewrite_local]
# 1. 获取 Cookie (打开 App 自动触发)
^https?:\/\/user-api\.smzdm\.com\/.* url script-request-header https://raw.githubusercontent.com/duoxiong/Quantumult-X/refs/heads/main/rewrite/smzdm_sign.js

[task_local]
# 2. 定时签到 (每天早上 9:00 执行)
0 9 * * * https://raw.githubusercontent.com/duoxiong/Quantumult-X/refs/heads/main/rewrite/smzdm_sign.js, tag=什么值得买签到, img-url=https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color/smzdm.png, enabled=true

[mitm]
hostname = user-api.smzdm.com
*/

const $ = new Env("什么值得买");
const cookieKey = "smzdm_cookie_qx";

// 🚦 逻辑入口
!(async () => {
    if (typeof $request !== "undefined") {
        GetCookie();
    } else {
        await SignIn();
    }
})()
.catch((e) => {
    $.logErr(e);
})
.finally(() => {
    $.done();
});

// -------------------------------------------------------
// 📡 1. 抓取逻辑
// -------------------------------------------------------
function GetCookie() {
    if ($request && $request.headers) {
        const headers = $request.headers;
        // 兼容不同平台和应用可能产生的大小写问题
        const cookie = headers["Cookie"] || headers["cookie"];
        
        if (cookie && cookie.indexOf("sess=") !== -1) {
            const currentCookie = $.getdata(cookieKey);
            if (currentCookie !== cookie) {
                $.setdata(cookie, cookieKey);
                $.msg($.name, "🎉 抓取成功", "Cookie已保存！脚本将自动运行，请关闭重写规则。");
                $.log(`✅ 抓取成功: ${cookie}`);
            }
        }
    }
}

// -------------------------------------------------------
// 🚀 2. 签到逻辑
// -------------------------------------------------------
function SignIn() {
    return new Promise((resolve) => {
        const cookie = $.getdata(cookieKey);
        if (!cookie) {
            $.msg($.name, "🚫 未获取 Cookie", "请先开启 Rewrite 规则并打开 App 获取！");
            resolve();
            return;
        }

        const url = {
            url: "https://zhiyou.smzdm.com/user/checkin/jsonp_checkin",
            headers: {
                "Cookie": cookie,
                "Referer": "https://www.smzdm.com/",
                "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1"
            }
        };

        $.get(url, (err, resp, data) => {
            try {
                if (err) {
                    $.log(`签到请求失败: ${err}`);
                    $.msg($.name, "🚫 网络错误", err);
                } else {
                    const result = JSON.parse(data);
                    if (result.error_code === 0) {
                        const days = result.data.checkin_num || "未知";
                        const gold = result.data.gold || "0";
                        const exp = result.data.exp || "0";
                        $.msg($.name, "✅ 签到成功", `连续签到: ${days}天\n奖励: ${gold}金币 | ${exp}经验`);
                        $.log(`签到成功: 连续 ${days} 天, 奖励 ${gold}金币`);
                    } else if (result.error_msg && result.error_msg.includes("已经签到")) {
                        $.msg($.name, "ℹ️ 重复签到", "今日任务已完成");
                        $.log("重复签到: 今日已完成签到");
                    } else {
                        $.msg($.name, "⚠️ 签到反馈", result.error_msg || "未知错误");
                        $.log(`签到失败: ${data}`);
                    }
                }
            } catch (e) {
                $.logErr(e, resp);
                $.msg($.name, "❌ 异常", "响应非 JSON 格式或 Cookie 失效。");
            } finally {
                resolve();
            }
        });
    });
}

// -------------------------------------------------------
// ⚙️ 底层环境 Env
// -------------------------------------------------------
function Env(name, opts) {
    class Http {
        constructor(env) { this.env = env; }
        send(opts, method = "GET") {
            opts = typeof opts === "string" ? { url: opts } : opts;
            let sender = this.get;
            if (method === "POST") sender = this.post;
            return new Promise((resolve, reject) => {
                sender.call(this, opts, (err, resp, body) => {
                    if (err) reject(err);
                    else resolve(resp);
                });
            });
        }
        get(opts) { return this.send.call(this.env, opts); }
        post(opts) { return this.send.call(this.env, opts, "POST"); }
    }
    return new (class {
        constructor(name, opts) {
            this.name = name;
            this.http = new Http(this);
            this.data = null;
            this.dataFile = "box.dat";
            this.logs = [];
            this.isMute = false;
            this.isNeedRewrite = false;
            this.logSeparator = "\n";
            this.startTime = new Date().getTime();
            Object.assign(this, opts);
            this.log("", `🔔${this.name}, 开始!`);
        }
        isNode() { return typeof module !== "undefined" && !!module.exports; }
        isQuanX() { return typeof $task !== "undefined"; }
        isSurge() { return typeof $httpClient !== "undefined" && typeof $loon === "undefined"; }
        isLoon() { return typeof $loon !== "undefined"; }
        getdata(key) {
            if (this.isSurge() || this.isLoon()) return $persistentStore.read(key);
            if (this.isQuanX()) return $prefs.valueForKey(key);
            if (this.isNode()) {
                this.data = this.loaddata();
                return this.data[key];
            }
            return (this.data && this.data[key]) || null;
        }
        setdata(val, key) {
            if (this.isSurge() || this.isLoon()) return $persistentStore.write(val, key);
            if (this.isQuanX()) return $prefs.setValueForKey(val, key);
            if (this.isNode()) {
                this.data = this.loaddata();
                this.data[key] = val;
                this.writedata();
                return true;
            }
            return (this.data && this.data[key]) || null;
        }
        get(opts, callback = () => {}) {
            if (this.isQuanX()) {
                if (this.isNeedRewrite) {
                    opts.opts = opts.opts || {};
                    Object.assign(opts.opts, { hints: false });
                }
                $task.fetch(opts).then(
                    (resp) => {
                        const { statusCode: status, statusCode, headers, body } = resp;
                        callback(null, { status, statusCode, headers, body }, body);
                    },
                    (err) => callback(err)
                );
            }
        }
        post(opts, callback = () => {}) {
            if (this.isQuanX()) {
                opts.method = "POST";
                if (this.isNeedRewrite) {
                    opts.opts = opts.opts || {};
                    Object.assign(opts.opts, { hints: false });
                }
                $task.fetch(opts).then(
                    (resp) => {
                        const { statusCode: status, statusCode, headers, body } = resp;
                        callback(null, { status, statusCode, headers, body }, body);
                    },
                    (err) => callback(err)
                );
            }
        }
        msg(title = name, subt = "", desc = "", opts) {
            if (!this.isMute) {
                if (this.isQuanX()) $notify(title, subt, desc, opts);
            }
        }
        log(...logs) {
            if (logs.length > 0) this.logs = [...this.logs, ...logs];
            console.log(logs.join(this.logSeparator));
        }
        logErr(err, msg) {
            const isCrash = !this.isSurge() && !this.isQuanX() && !this.isLoon();
            if (isCrash) this.log("", `❗️${this.name}, 错误!`, err.stack);
            else this.log("", `❗️${this.name}, 错误!`, err);
        }
        done(val = {}) {
            const endTime = new Date().getTime();
            const costTime = (endTime - this.startTime) / 1000;
            this.log("", `🔔${this.name}, 结束! 🕛 ${costTime} 秒`);
            if (this.isSurge() || this.isQuanX() || this.isLoon()) $done(val);
        }
    })(name, opts);
}
