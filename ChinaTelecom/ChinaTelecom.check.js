/*
 * ChinaTelecom.check.js
 * 定时检测 Cookie 是否有效，如果失效则通知（可选尝试自动触发登录）
 * 放到 Quantumult X 的 task_local（cron）中运行
 */

const KEY = "ChinaTelecomCookie";
const LOGIN_URL_KEY = "ChinaTelecomLoginUrl"; // 可选：在 $prefs 中保存 loginUrl 以便自动尝试刷新
const cookie = $prefs.valueForKey(KEY) || "";
const updateTime = $prefs.valueForKey(`${KEY}_update`) || "未知";

!(async () => {
  if (!cookie) {
    $notify("⚠️ 中国电信 Cookie 未找到", "请打开电信 App 或网页触发抓取", "");
    return $done();
  }

  const url = "https://open.e.189.cn/api/user/info";
  const req = { url, headers: { Cookie: cookie }, timeout: 15000 };

  try {
    const resp = await $task.fetch(req);
    const body = resp.body || "";
    if (resp.status === 401 || /登录失效|expired|未登录/i.test(body)) {
      $notify("❌ 中国电信 Cookie 失效", "请重新登录以触发抓取", "");
      // 可选：尝试用 loginUrl 触发刷新（仅在你事先在 $prefs 存了有效 loginUrl 时尝试）
      const loginUrl = $prefs.valueForKey(LOGIN_URL_KEY) || "";
      if (loginUrl) {
        try {
          console.log("[ChinaTelecom] 尝试访问 loginUrl 以触发刷新: " + loginUrl);
          await $task.fetch({ url: loginUrl, timeout: 10000 });
          // 成功后，Quantumult X 的 rewrite 规则可能会捕获新的请求并更新 Cookie
          $notify("尝试触发登录", "已访问 loginUrl，稍后请检查 Cookie 是否更新", "");
        } catch (e) {
          console.log("[ChinaTelecom] 访问 loginUrl 失败: " + e);
        }
      }
    } else {
      $notify("✅ 中国电信 Cookie 正常", "", `上次更新时间：${updateTime}`);
    }
  } catch (err) {
    console.log("[ChinaTeleCom] 检测请求异常: " + err);
    $notify("⚠️ Cookie 检测失败", "网络或请求异常", String(err));
  }

  $done();
})();
