/*
项目名称：两步路户外助手 - 活跃度自动执行 (全量回放版)
更新说明：针对两步路 helper.2bulu.com 新接口，全量截获带 psign 的 URL 和 Cookie 进行无损重放。
*/

const $ = new Env("两步路活跃");

const KEY_URL = "duoxiong_2bulu_url";
const KEY_HEADERS = "duoxiong_2bulu_headers";

if (typeof $request !== 'undefined') {
    CaptureRequest();
} else {
    ExecuteTask();
}

// -------------------------------------------------------
// 📡 1. 抓取逻辑：保存完整的 URL 和 Headers
// -------------------------------------------------------
function CaptureRequest() {
    const url = $request.url;
    const headers = $request.headers;

    // 只有包含 authCode 的鉴权 URL 我们才抓取
    if (url.includes("authCode=") || url.includes("psign=")) {
        $.setdata(url, KEY_URL);
        $.setdata(JSON.stringify(headers), KEY_HEADERS);
        
        // 提取接口名称用于提示
        const matchInfo = url.match(/helper\.2bulu\.com\/([^\?]+)/);
        const apiName = matchInfo ? matchInfo[1] : "未知接口";

        $.msg($.name, "✅ 凭证捕获成功", `已锁定接口: ${apiName}\n完整 URL 及 Cookie 已保存，可前往 QX 手动运行测试。`);
        console.log(`✅ [两步路] 抓取成功: ${url}`);
    }
    $done({});
}

// -------------------------------------------------------
// 🚀 2. 任务执行逻辑：原样重放
// -------------------------------------------------------
function ExecuteTask() {
    const savedUrl = $.getdata(KEY_URL);
    const headersStr = $.getdata(KEY_HEADERS);

    if (!savedUrl || !headersStr) {
        $.msg($.name, "🚫 缺少数据", "请先打开两步路 App 触发对应操作 (如刷新个人页或点赞) 进行抓包。");
        $done(); return;
    }

    let headers = {};
    try {
        headers = JSON.parse(headersStr);
        // 清理可能导致乱码或冲突的请求头
        delete headers['Content-Length'];
        delete headers['content-length'];
        delete headers['Accept-Encoding'];
    } catch (e) {
        console.log("❌ [两步路] Headers 解析失败");
        $done(); return;
    }

    console.log(`>>> 准备重放请求: ${savedUrl}`);

    const opts = {
        url: savedUrl,
        method: "GET", // 两步路新接口几乎全是 GET
        headers: headers
    };

    $task.fetch(opts).then(response => {
        try {
            const res = JSON.parse(response.body);
            // 两步路的成功标识通常是 code=0 或 code=200
            if (res.code == 0 || res.code == 200 || res.success) {
                $.msg($.name, "✅ 任务执行成功", `响应信息: ${res.message || res.msg || "操作成功"}`);
            } else {
                $.msg($.name, "⚠️ 任务异常", res.message || res.msg || "未知错误，请检查日志");
                console.log(`⚠️ [两步路] 异常返回: ${response.body}`);
            }
        } catch (e) {
            $.msg($.name, "❌ 响应解析失败", "服务器可能返回了非 JSON 数据。");
            console.log(`❌ [两步路] 原始返回: ${response.body}`);
        }
        $done();
    }, reason => {
        $.msg($.name, "🚫 网络请求失败", reason.error);
        $done();
    });
}

// -------------------------------------------------------
// ⚙️ Env 环境类 (精简兼容版)
// -------------------------------------------------------
function Env(t){return new class{constructor(t){this.name=t}msg(t,e,s){if("undefined"!=typeof $notify)$notify(t,e,s);console.log(`[${t}] ${e} - ${s}`)}setdata(t,e){return"undefined"!=typeof $prefs?$prefs.setValueForKey(t,e):"undefined"!=typeof $persistentStore?$persistentStore.write(t,e):void 0}getdata(t){return"undefined"!=typeof $prefs?$prefs.valueForKey(t):"undefined"!=typeof $persistentStore?$persistentStore.read(t):void 0}done(){"undefined"!=typeof $done&&$done({})}}(t)}
