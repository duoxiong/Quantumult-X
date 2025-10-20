/*
 * 中国电信 Cookie 检查与自动更新提醒
 * 每天三次检测（9:00、15:00、21:00）
 */

const KEY = "ChinaTelecomCookie";
const cookie = $prefs.valueForKey(KEY);
const updateTime = $prefs.valueForKey(`${KEY}_update`) || "未知";

!(async () => {
  if (!cookie) {
    $notify("⚠️ Cookie 不存在", "请重新打开中国电信 App 抓取", "");
    return $done();
  }

  const url = "https://open.e.189.cn/api/user/info";
  const req = { url, headers: { Cookie: cookie } };

  try {
    const resp = await $task.fetch(req);
    if (resp.status === 401 || /登录失效|expired/i.test(resp.body)) {
      $notify("❌ Cookie 已失效", "请重新登录抓取", "");
    } else {
      $notify("✅ Cookie 正常", "", `上次更新时间：${updateTime}`);
    }
  } catch (err) {
    $notify("⚠️ 检测失败", "可能网络异常", String(err));
  }

  $done();
})();
